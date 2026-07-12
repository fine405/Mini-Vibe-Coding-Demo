import "@tanstack/react-start/server-only";
import {
	createWorkspaceSnapshot,
	DEFAULT_SNAPSHOT_LIMITS,
	hashText,
	normalizeWorkspacePath,
} from "@/modules/workspace/domain";
import type {
	WorkspaceChange,
	WorkspaceChangeSet,
	WorkspaceSnapshot,
} from "@/modules/workspace/types";

const MAX_FILE_BYTES = 256 * 1024;
const MAX_SEARCH_RESULTS = 100;
const MAX_REGEX_LINE_LENGTH = 32 * 1024;

export type RunWorkspaceErrorCode =
	| "INVALID_SNAPSHOT"
	| "FILE_NOT_FOUND"
	| "READ_REQUIRED"
	| "UNSAFE_FILE"
	| "INVALID_QUERY"
	| "FINALIZED";

export class RunWorkspaceError extends Error {
	constructor(
		readonly code: RunWorkspaceErrorCode,
		message: string,
	) {
		super(message);
		this.name = "RunWorkspaceError";
	}
}

export interface RunWorkspaceFile {
	path: string;
	content: string;
	hash: string;
}

export interface RunWorkspaceFileSummary {
	path: string;
	hash: string;
	bytes: number;
}

export interface RunWorkspaceSearchResult {
	path: string;
	line: number;
	text: string;
}

export class RunWorkspace {
	readonly #base: WorkspaceSnapshot;
	readonly #files = new Map<string, string>();
	readonly #readPaths = new Set<string>();
	#finalized = false;

	get finalized(): boolean {
		return this.#finalized;
	}

	constructor(snapshot: WorkspaceSnapshot) {
		if (!snapshot.revision) {
			throw new RunWorkspaceError(
				"INVALID_SNAPSHOT",
				"Snapshot revision is required",
			);
		}
		const entries = Object.entries(snapshot.files);
		if (entries.length > DEFAULT_SNAPSHOT_LIMITS.maxFiles) {
			throw new RunWorkspaceError(
				"INVALID_SNAPSHOT",
				`Snapshot exceeds ${DEFAULT_SNAPSHOT_LIMITS.maxFiles} files`,
			);
		}
		const baseFiles: WorkspaceSnapshot["files"] = {};
		let totalBytes = 0;
		for (const [inputPath, file] of entries) {
			const path = normalizeWorkspacePath(inputPath);
			const bytes = new TextEncoder().encode(file.content).byteLength;
			totalBytes += bytes;
			if (totalBytes > DEFAULT_SNAPSHOT_LIMITS.maxTotalBytes) {
				throw new RunWorkspaceError(
					"INVALID_SNAPSHOT",
					`Snapshot exceeds ${DEFAULT_SNAPSHOT_LIMITS.maxTotalBytes} bytes`,
				);
			}
			if (path in baseFiles || hashText(file.content) !== file.hash) {
				throw new RunWorkspaceError(
					"INVALID_SNAPSHOT",
					`Snapshot file failed integrity validation: ${path}`,
				);
			}
			assertSafeFile(path, file.content);
			baseFiles[path] = { content: file.content, hash: file.hash };
			this.#files.set(path, file.content);
		}
		this.#base = { revision: snapshot.revision, files: baseFiles };
	}

	listFiles(query?: string): RunWorkspaceFileSummary[] {
		this.#assertOpen();
		const normalizedQuery = query?.trim().toLowerCase();
		return [...this.#files.entries()]
			.filter(
				([path]) =>
					!normalizedQuery || path.toLowerCase().includes(normalizedQuery),
			)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([path, content]) => ({
				path,
				hash: hashText(content),
				bytes: new TextEncoder().encode(content).byteLength,
			}));
	}

	readFile(inputPath: string): RunWorkspaceFile {
		this.#assertOpen();
		const path = normalizeWorkspacePath(inputPath);
		const content = this.#files.get(path);
		if (content === undefined) {
			throw new RunWorkspaceError("FILE_NOT_FOUND", `File not found: ${path}`);
		}
		this.#readPaths.add(path);
		return { path, content, hash: hashText(content) };
	}

	searchFiles(
		query: string,
		useRegex = false,
		abortSignal?: AbortSignal,
	): RunWorkspaceSearchResult[] {
		this.#assertOpen();
		abortSignal?.throwIfAborted();
		if (!query || query.length > 200) {
			throw new RunWorkspaceError(
				"INVALID_QUERY",
				"Search query must contain between 1 and 200 characters",
			);
		}
		let matcher: (line: string) => boolean;
		if (useRegex) {
			const regex = createBoundedRegex(query);
			matcher = (line) => regex.test(line.slice(0, MAX_REGEX_LINE_LENGTH));
		} else {
			const needle = query.toLowerCase();
			matcher = (line) => line.toLowerCase().includes(needle);
		}

		const results: RunWorkspaceSearchResult[] = [];
		for (const [path, content] of [...this.#files.entries()].sort(([a], [b]) =>
			a.localeCompare(b),
		)) {
			abortSignal?.throwIfAborted();
			const lines = content.split("\n");
			for (let index = 0; index < lines.length; index += 1) {
				if (index % 100 === 0) abortSignal?.throwIfAborted();
				if (!matcher(lines[index])) continue;
				this.#readPaths.add(path);
				results.push({
					path,
					line: index + 1,
					text: lines[index].slice(0, 500),
				});
				if (results.length >= MAX_SEARCH_RESULTS) return results;
			}
		}
		return results;
	}

	writeFile(inputPath: string, content: string): RunWorkspaceFile {
		this.#assertOpen();
		const path = normalizeWorkspacePath(inputPath);
		if (this.#files.has(path) && !this.#readPaths.has(path)) {
			throw new RunWorkspaceError(
				"READ_REQUIRED",
				`Read ${path} before modifying it`,
			);
		}
		assertSafeFile(path, content);
		this.#files.set(path, content);
		this.#readPaths.add(path);
		return { path, content, hash: hashText(content) };
	}

	deleteFile(inputPath: string): { path: string; deleted: true } {
		this.#assertOpen();
		const path = normalizeWorkspacePath(inputPath);
		if (!this.#files.has(path)) {
			throw new RunWorkspaceError("FILE_NOT_FOUND", `File not found: ${path}`);
		}
		if (!this.#readPaths.has(path)) {
			throw new RunWorkspaceError(
				"READ_REQUIRED",
				`Read ${path} before deleting it`,
			);
		}
		this.#files.delete(path);
		return { path, deleted: true };
	}

	finalize(summary: string): WorkspaceChangeSet {
		this.#assertOpen();
		const normalizedSummary = summary.trim();
		if (!normalizedSummary) {
			throw new RunWorkspaceError(
				"INVALID_QUERY",
				"A non-empty change summary is required",
			);
		}

		const changes: WorkspaceChange[] = [];
		const paths = new Set([
			...Object.keys(this.#base.files),
			...this.#files.keys(),
		]);
		for (const path of [...paths].sort()) {
			const before = this.#base.files[path];
			const after = this.#files.get(path);
			if (!before && after !== undefined) {
				changes.push({ op: "create", path, beforeHash: null, content: after });
			} else if (before && after === undefined) {
				changes.push({ op: "delete", path, beforeHash: before.hash });
			} else if (before && after !== undefined && before.content !== after) {
				changes.push({
					op: "update",
					path,
					beforeHash: before.hash,
					content: after,
				});
			}
		}

		this.#finalized = true;
		return {
			id: `agent:${globalThis.crypto.randomUUID()}`,
			baseRevision: this.#base.revision,
			summary: normalizedSummary,
			changes,
		};
	}

	#assertOpen(): void {
		if (this.#finalized) {
			throw new RunWorkspaceError(
				"FINALIZED",
				"Run workspace has already been finalized",
			);
		}
	}
}

function createBoundedRegex(query: string): RegExp {
	let escaped = false;
	let inCharacterClass = false;
	let wildcardCount = 0;
	for (let index = 0; index < query.length; index += 1) {
		const character = query[index];
		if (escaped) {
			if (/\d/.test(character)) {
				throw new RunWorkspaceError(
					"INVALID_QUERY",
					"Regex backreferences are not supported",
				);
			}
			escaped = false;
			continue;
		}
		if (character === "\\") {
			escaped = true;
			continue;
		}
		if (character === "[") {
			inCharacterClass = true;
			continue;
		}
		if (character === "]" && inCharacterClass) {
			inCharacterClass = false;
			continue;
		}
		if (inCharacterClass) continue;
		if ("(){}|+?".includes(character)) {
			throw new RunWorkspaceError(
				"INVALID_QUERY",
				"Regex groups, alternation and variable quantifiers are not supported",
			);
		}
		if (character === "*") {
			if (query[index - 1] !== "." || wildcardCount > 0) {
				throw new RunWorkspaceError(
					"INVALID_QUERY",
					"Only one .* wildcard is supported in regex search",
				);
			}
			wildcardCount += 1;
		}
	}
	if (escaped || inCharacterClass) {
		throw new RunWorkspaceError("INVALID_QUERY", "Search regex is invalid");
	}
	try {
		return new RegExp(query, "i");
	} catch {
		throw new RunWorkspaceError("INVALID_QUERY", "Search regex is invalid");
	}
}

function assertSafeFile(path: string, content: string): void {
	const preflight = createWorkspaceSnapshot(
		{ [path]: content },
		{
			maxFiles: 1,
			maxFileBytes: MAX_FILE_BYTES,
			maxTotalBytes: MAX_FILE_BYTES,
		},
	);
	const omission = preflight.omissions[0];
	if (omission) {
		throw new RunWorkspaceError(
			"UNSAFE_FILE",
			`Agent cannot write ${path}: ${omission.reason}`,
		);
	}
}
