import { create } from "zustand";
import { browserWorkspace } from "@/modules/workspace/browser";
import { hashText, normalizeWorkspacePath } from "@/modules/workspace/domain";
import { workspaceChangeSetSchema } from "@/modules/workspace/schema";
import type {
	ApplyResult,
	WorkspaceChange,
	WorkspaceChangeSet,
	WorkspaceSnapshot,
} from "@/modules/workspace/types";

export interface CompletedAgentToolResult {
	toolName: string;
	input: unknown;
	output: unknown;
}

export interface ProjectedAgentChange {
	op: WorkspaceChange["op"];
	path: string;
	originalContent: string;
	content: string;
}

export interface ToolProjectionResult {
	accepted: boolean;
	openedPath?: string;
}

export type AgentChangeSessionPhase = "idle" | "running" | "finalized";
export type AgentReviewStatus = "pending" | "applying" | "applied" | "rejected";
export type AgentReviewSelections = Record<number, number[]>;

export interface AgentChangeSessionState {
	runId: string | null;
	phase: AgentChangeSessionPhase;
	baseRevision: string | null;
	baseFiles: Record<string, string>;
	changesByPath: Record<string, ProjectedAgentChange>;
	orderedPaths: string[];
	activePath: string | null;
	hasAutoOpenedFile: boolean;
	discardedPaths: string[];
	discardAllRequested: boolean;
	changeSet: WorkspaceChangeSet | null;
	reviewSelections: AgentReviewSelections | null;
	reviewStatus: AgentReviewStatus;
	reviewTransactionId: string | null;
	reviewError: string | null;
	reviewHasConflict: boolean;
	begin(snapshot: WorkspaceSnapshot): void;
	projectToolResult(result: CompletedAgentToolResult): ToolProjectionResult;
	setActivePath(path: string): boolean;
	discardPath(path: string): string | null;
	requestDiscardAll(): void;
	initializeReviewSelections(
		changeSetId: string,
		selections: AgentReviewSelections,
	): boolean;
	setReviewSelections(
		changeSetId: string,
		selections: AgentReviewSelections,
	): boolean;
	applyReviewSelection(changeSetId: string): Promise<ApplyResult | null>;
	rejectReview(changeSetId: string): boolean;
	clear(): void;
}

const emptySession = {
	runId: null,
	phase: "idle" as const,
	baseRevision: null,
	baseFiles: {},
	changesByPath: {},
	orderedPaths: [],
	activePath: null,
	hasAutoOpenedFile: false,
	discardedPaths: [],
	discardAllRequested: false,
	changeSet: null,
	reviewSelections: null,
	reviewStatus: "pending" as const,
	reviewTransactionId: null,
	reviewError: null,
	reviewHasConflict: false,
};

export const useAgentChangeSessionStore = create<AgentChangeSessionState>(
	(set, get) => ({
		...emptySession,
		begin(snapshot) {
			set({
				...emptySession,
				runId: createRunId(),
				phase: "running",
				baseRevision: snapshot.revision,
				baseFiles: Object.fromEntries(
					Object.entries(snapshot.files).map(([path, file]) => [
						path,
						file.content,
					]),
				),
			});
		},
		projectToolResult(result) {
			const state = get();
			if (state.phase !== "running") {
				return { accepted: false };
			}
			if (result.toolName === "finalize_changes") {
				const changeSet = parseFinalizedChangeSet(result.output);
				if (!changeSet || changeSet.baseRevision !== state.baseRevision) {
					return { accepted: false };
				}
				const changesByPath: Record<string, ProjectedAgentChange> = {};
				for (const change of changeSet.changes) {
					let path: string;
					try {
						path = normalizeWorkspacePath(change.path);
					} catch {
						return { accepted: false };
					}
					const originalContent = state.baseFiles[path];
					if (
						path !== change.path ||
						changesByPath[path] !== undefined ||
						(change.op === "create" && originalContent !== undefined) ||
						(change.op !== "create" &&
							(originalContent === undefined ||
								hashText(originalContent) !== change.beforeHash))
					) {
						return { accepted: false };
					}
					changesByPath[path] = {
						op: change.op,
						path,
						originalContent: originalContent ?? "",
						content: change.op === "delete" ? "" : change.content,
					};
				}
				const changePaths = new Set(Object.keys(changesByPath));
				const orderedPaths = [
					...state.orderedPaths.filter((path) => changePaths.has(path)),
					...changeSet.changes
						.map((change) => change.path)
						.filter((path) => !state.orderedPaths.includes(path)),
				];
				const visiblePaths = orderedPaths.filter(
					(path) => !state.discardedPaths.includes(path),
				);
				const activePath =
					state.activePath && visiblePaths.includes(state.activePath)
						? state.activePath
						: (visiblePaths[0] ?? null);
				const shouldAutoOpen =
					!state.hasAutoOpenedFile &&
					state.activePath === null &&
					activePath !== null;
				set({
					phase: "finalized",
					changesByPath,
					orderedPaths,
					activePath,
					hasAutoOpenedFile: state.hasAutoOpenedFile || shouldAutoOpen,
					changeSet,
				});
				return {
					accepted: true,
					...(shouldAutoOpen ? { openedPath: activePath } : {}),
				};
			}
			if (result.toolName === "delete_file") {
				const path = parseCompletedDelete(result);
				if (!path) return { accepted: false };
				if (state.baseFiles[path] === undefined) {
					if (state.changesByPath[path]?.op !== "create") {
						return { accepted: false };
					}
					const changesByPath = { ...state.changesByPath };
					delete changesByPath[path];
					const visiblePaths = state.orderedPaths.filter(
						(candidate) =>
							changesByPath[candidate] !== undefined &&
							!state.discardedPaths.includes(candidate),
					);
					set({
						changesByPath,
						activePath:
							state.activePath === path
								? (visiblePaths[0] ?? null)
								: state.activePath,
					});
					return { accepted: true };
				}
				const isDiscarded = state.discardedPaths.includes(path);
				const shouldAutoOpen =
					!state.hasAutoOpenedFile && state.activePath === null && !isDiscarded;
				set({
					changesByPath: {
						...state.changesByPath,
						[path]: {
							op: "delete",
							path,
							originalContent: state.baseFiles[path],
							content: "",
						},
					},
					orderedPaths: state.orderedPaths.includes(path)
						? state.orderedPaths
						: [...state.orderedPaths, path],
					activePath: state.activePath ?? (isDiscarded ? null : path),
					hasAutoOpenedFile: state.hasAutoOpenedFile || shouldAutoOpen,
				});
				return {
					accepted: true,
					...(shouldAutoOpen ? { openedPath: path } : {}),
				};
			}
			if (result.toolName !== "write_file") return { accepted: false };
			const write = parseCompletedWrite(result);
			if (!write) return { accepted: false };

			const originalContent = state.baseFiles[write.path] ?? "";
			if (write.content === originalContent) {
				const changesByPath = { ...state.changesByPath };
				delete changesByPath[write.path];
				const visiblePaths = state.orderedPaths.filter(
					(path) =>
						changesByPath[path] !== undefined &&
						!state.discardedPaths.includes(path),
				);
				set({
					changesByPath,
					activePath:
						state.activePath === write.path
							? (visiblePaths[0] ?? null)
							: state.activePath,
				});
				return { accepted: true };
			}
			const isDiscarded = state.discardedPaths.includes(write.path);
			const shouldAutoOpen =
				!state.hasAutoOpenedFile && state.activePath === null && !isDiscarded;
			set({
				changesByPath: {
					...state.changesByPath,
					[write.path]: {
						op: state.baseFiles[write.path] === undefined ? "create" : "update",
						path: write.path,
						originalContent,
						content: write.content,
					},
				},
				orderedPaths: state.orderedPaths.includes(write.path)
					? state.orderedPaths
					: [...state.orderedPaths, write.path],
				activePath: state.activePath ?? (isDiscarded ? null : write.path),
				hasAutoOpenedFile: state.hasAutoOpenedFile || shouldAutoOpen,
			});
			return {
				accepted: true,
				...(shouldAutoOpen ? { openedPath: write.path } : {}),
			};
		},
		setActivePath(inputPath) {
			const state = get();
			let path: string;
			try {
				path = normalizeWorkspacePath(inputPath);
			} catch {
				return false;
			}
			if (!selectReviewableAgentPaths(state).includes(path)) return false;
			set({ activePath: path });
			return true;
		},
		discardPath(inputPath) {
			const state = get();
			let path: string;
			try {
				path = normalizeWorkspacePath(inputPath);
			} catch {
				return state.activePath;
			}
			if (
				state.changesByPath[path] === undefined ||
				state.discardedPaths.includes(path)
			) {
				return state.activePath;
			}
			const discardedPaths = [...state.discardedPaths, path];
			const visiblePaths = state.orderedPaths.filter(
				(candidate) =>
					state.changesByPath[candidate] !== undefined &&
					!discardedPaths.includes(candidate),
			);
			const activePath =
				state.activePath === path
					? (visiblePaths[0] ?? null)
					: state.activePath;
			let reviewSelections = state.reviewSelections;
			if (state.changeSet && reviewSelections) {
				const changeIndex = state.changeSet.changes.findIndex(
					(change) => change.path === path,
				);
				if (changeIndex >= 0) {
					reviewSelections = {
						...reviewSelections,
						[changeIndex]: [],
					};
				}
			}
			set({ discardedPaths, activePath, reviewSelections });
			return activePath;
		},
		requestDiscardAll() {
			set({ ...emptySession, discardAllRequested: true });
		},
		initializeReviewSelections(changeSetId, inputSelections) {
			const state = get();
			if (
				state.phase !== "finalized" ||
				state.changeSet?.id !== changeSetId ||
				state.reviewStatus !== "pending"
			) {
				return false;
			}
			const reviewSelections = normalizeReviewSelections(
				inputSelections,
				state.changeSet.changes.length,
			);
			for (let index = 0; index < state.changeSet.changes.length; index += 1) {
				if (
					state.discardedPaths.includes(state.changeSet.changes[index].path)
				) {
					reviewSelections[index] = [];
				}
			}
			const visiblePaths = selectReviewableAgentPaths({
				...state,
				reviewSelections,
			});
			set({
				reviewSelections,
				activePath:
					state.activePath && visiblePaths.includes(state.activePath)
						? state.activePath
						: (visiblePaths[0] ?? null),
			});
			return true;
		},
		setReviewSelections(changeSetId, inputSelections) {
			const state = get();
			if (
				state.phase !== "finalized" ||
				state.changeSet?.id !== changeSetId ||
				state.reviewStatus !== "pending"
			) {
				return false;
			}
			const reviewSelections = normalizeReviewSelections(
				inputSelections,
				state.changeSet.changes.length,
			);
			const discardedPaths = state.changeSet.changes
				.filter((_change, index) => reviewSelections[index].length === 0)
				.map((change) => change.path);
			const visiblePaths = selectReviewableAgentPaths({
				...state,
				discardedPaths,
				reviewSelections,
			});
			set({
				reviewSelections,
				discardedPaths,
				activePath:
					state.activePath && visiblePaths.includes(state.activePath)
						? state.activePath
						: (visiblePaths[0] ?? null),
			});
			return true;
		},
		async applyReviewSelection(changeSetId) {
			const state = get();
			if (
				state.phase !== "finalized" ||
				state.changeSet?.id !== changeSetId ||
				state.reviewStatus !== "pending"
			) {
				return null;
			}
			const selectedChangeIndices = state.changeSet.changes
				.map((_change, index) => index)
				.filter((index) =>
					state.reviewSelections
						? state.reviewSelections[index]?.length > 0
						: !state.discardedPaths.includes(
								state.changeSet?.changes[index].path ?? "",
							),
				);
			if (selectedChangeIndices.length === 0) return null;

			set({
				reviewStatus: "applying",
				reviewError: null,
				reviewHasConflict: false,
			});
			try {
				const result = await browserWorkspace.apply(
					state.changeSet,
					state.reviewSelections
						? { hunkIndicesByChange: state.reviewSelections }
						: { changeIndices: selectedChangeIndices },
				);
				if (get().changeSet?.id !== changeSetId) return result;
				if (!result.ok) {
					set({
						reviewStatus: "pending",
						reviewError: `${result.code}: ${result.message}`,
						reviewHasConflict:
							result.code === "HASH_CONFLICT" ||
							result.code === "PATH_CONFLICT" ||
							result.code === "STALE_REVISION",
					});
					return result;
				}
				set({
					...emptySession,
					changeSet: state.changeSet,
					reviewStatus: "applied",
					reviewTransactionId: result.transactionId,
				});
				return result;
			} catch (error) {
				if (get().changeSet?.id === changeSetId) {
					set({
						reviewStatus: "pending",
						reviewError:
							error instanceof Error
								? error.message
								: "The selected changes could not be applied",
						reviewHasConflict: false,
					});
				}
				throw error;
			}
		},
		rejectReview(changeSetId) {
			const state = get();
			if (
				state.phase !== "finalized" ||
				state.changeSet?.id !== changeSetId ||
				state.reviewStatus !== "pending"
			) {
				return false;
			}
			set({
				...emptySession,
				changeSet: state.changeSet,
				reviewStatus: "rejected",
			});
			return true;
		},
		clear() {
			set(emptySession);
		},
	}),
);

export function selectReviewableAgentPaths(
	state: Pick<
		AgentChangeSessionState,
		| "changeSet"
		| "changesByPath"
		| "discardedPaths"
		| "orderedPaths"
		| "reviewSelections"
	>,
): string[] {
	return state.orderedPaths.filter((path) => {
		if (
			state.changesByPath[path] === undefined ||
			state.discardedPaths.includes(path)
		) {
			return false;
		}
		if (!state.changeSet || !state.reviewSelections) return true;
		const index = state.changeSet.changes.findIndex(
			(change) => change.path === path,
		);
		return index >= 0 && state.reviewSelections[index]?.length > 0;
	});
}

function normalizeReviewSelections(
	selections: AgentReviewSelections,
	changeCount: number,
): AgentReviewSelections {
	return Object.fromEntries(
		Array.from({ length: changeCount }, (_, index) => [
			index,
			[...new Set(selections[index] ?? [])]
				.filter((hunkIndex) => Number.isInteger(hunkIndex) && hunkIndex >= 0)
				.sort((left, right) => left - right),
		]),
	);
}

function parseFinalizedChangeSet(output: unknown): WorkspaceChangeSet | null {
	let candidate = output;
	if (typeof output === "string") {
		try {
			candidate = JSON.parse(output);
		} catch {
			return null;
		}
	}
	const parsed = workspaceChangeSetSchema.safeParse(candidate);
	return parsed.success ? parsed.data : null;
}

function parseCompletedDelete(result: CompletedAgentToolResult): string | null {
	if (!isRecord(result.input) || !isRecord(result.output)) return null;
	if (
		typeof result.input.path !== "string" ||
		typeof result.output.path !== "string" ||
		result.output.deleted !== true
	) {
		return null;
	}
	try {
		const inputPath = normalizeWorkspacePath(result.input.path);
		const outputPath = normalizeWorkspacePath(result.output.path);
		return inputPath === outputPath ? inputPath : null;
	} catch {
		return null;
	}
}

function parseCompletedWrite(result: CompletedAgentToolResult): {
	path: string;
	content: string;
} | null {
	if (!isRecord(result.input) || !isRecord(result.output)) return null;
	if (
		typeof result.input.path !== "string" ||
		typeof result.input.content !== "string" ||
		typeof result.output.path !== "string" ||
		typeof result.output.hash !== "string"
	) {
		return null;
	}
	try {
		const inputPath = normalizeWorkspacePath(result.input.path);
		const outputPath = normalizeWorkspacePath(result.output.path);
		if (
			inputPath !== outputPath ||
			hashText(result.input.content) !== result.output.hash
		) {
			return null;
		}
		return { path: inputPath, content: result.input.content };
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function createRunId(): string {
	const id =
		globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
	return `agent-draft:${id}`;
}
