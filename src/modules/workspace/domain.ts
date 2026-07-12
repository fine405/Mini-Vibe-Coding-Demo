import { diffLines } from "diff";
import type {
	ApplyFailure,
	ChangePreview,
	ChangePreviewFile,
	ChangeSelection,
	PreparedWorkspaceTransaction,
	SnapshotOmission,
	SnapshotOptions,
	SnapshotPreflight,
	WorkspaceChange,
	WorkspaceChangeSet,
	WorkspaceFiles,
	WorkspaceSnapshot,
} from "@/modules/workspace/types";

export const DEFAULT_SNAPSHOT_LIMITS = {
	maxFiles: 250,
	maxFileBytes: 256 * 1024,
	maxTotalBytes: 2 * 1024 * 1024,
} as const;

const BLOCKED_SEGMENTS = new Set([
	".git",
	".next",
	".output",
	"build",
	"coverage",
	"dist",
	"node_modules",
]);

const SECRET_FILENAMES = new Set([
	".git-credentials",
	".netrc",
	".npmrc",
	".pypirc",
	".yarnrc",
	".yarnrc.yml",
	"credentials",
	"credentials.json",
	"id_dsa",
	"id_ed25519",
	"id_rsa",
	"secrets.json",
]);

const SECRET_EXTENSIONS = [".key", ".p12", ".pfx", ".pem"];
const SECRET_PATH_SUFFIXES = [
	"/.docker/config.json",
	"/.config/gcloud/application_default_credentials.json",
	"/.azure/accesstokens.json",
];
const HASH_OFFSET = 0xcbf29ce484222325n;
const HASH_PRIME = 0x100000001b3n;
const HASH_MASK = 0xffffffffffffffffn;

export class WorkspacePathError extends Error {
	readonly code = "INVALID_WORKSPACE_PATH";

	constructor(path: string, reason: string) {
		super(`Invalid workspace path ${JSON.stringify(path)}: ${reason}`);
		this.name = "WorkspacePathError";
	}
}

export function normalizeWorkspacePath(input: string): string {
	if (!input || input.includes("\0")) {
		throw new WorkspacePathError(input, "path is empty or contains NUL");
	}
	if (/^[a-zA-Z]:[\\/]/.test(input) || input.includes("\\")) {
		throw new WorkspacePathError(
			input,
			"host or backslash paths are forbidden",
		);
	}

	const segments = input
		.split("/")
		.filter((segment) => segment && segment !== ".");
	if (segments.length === 0 || segments.some((segment) => segment === "..")) {
		throw new WorkspacePathError(
			input,
			"path must name a file inside the workspace",
		);
	}

	return `/${segments.join("/")}`;
}

export function hashText(content: string): string {
	let hash = HASH_OFFSET;
	for (const byte of new TextEncoder().encode(content)) {
		hash ^= BigInt(byte);
		hash = (hash * HASH_PRIME) & HASH_MASK;
	}
	return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
}

export function normalizeWorkspaceFiles(files: WorkspaceFiles): WorkspaceFiles {
	const normalized: WorkspaceFiles = {};
	for (const [inputPath, content] of Object.entries(files)) {
		const path = normalizeWorkspacePath(inputPath);
		if (path in normalized) {
			throw new WorkspacePathError(
				inputPath,
				`duplicates normalized path ${path}`,
			);
		}
		normalized[path] = content;
	}
	return normalized;
}

export function computeWorkspaceRevision(files: WorkspaceFiles): string {
	const manifest = Object.keys(files)
		.sort()
		.map((path) => `${path}\0${hashText(files[path])}`)
		.join("\0");
	return hashText(manifest);
}

function isSecretPath(path: string): boolean {
	const lowerPath = path.toLowerCase();
	const filename = lowerPath.slice(lowerPath.lastIndexOf("/") + 1);
	return (
		filename === ".env" ||
		filename.startsWith(".env.") ||
		SECRET_FILENAMES.has(filename) ||
		SECRET_EXTENSIONS.some((extension) => filename.endsWith(extension)) ||
		lowerPath.split("/").includes(".ssh") ||
		SECRET_PATH_SUFFIXES.some((suffix) => lowerPath.endsWith(suffix))
	);
}

function isBlockedPath(path: string): boolean {
	return path
		.toLowerCase()
		.split("/")
		.some((segment) => BLOCKED_SEGMENTS.has(segment));
}

function looksBinary(content: string): boolean {
	if (content.includes("\0")) return true;
	if (content.length === 0) return false;
	let controlCharacters = 0;
	for (let index = 0; index < content.length; index += 1) {
		const code = content.charCodeAt(index);
		if (code < 9 || (code > 13 && code < 32)) controlCharacters += 1;
	}
	return controlCharacters / content.length > 0.1;
}

export function createWorkspaceSnapshot(
	inputFiles: WorkspaceFiles,
	options: SnapshotOptions = {},
): SnapshotPreflight {
	const files = normalizeWorkspaceFiles(inputFiles);
	const limits = { ...DEFAULT_SNAPSHOT_LIMITS, ...options };
	const snapshotFiles: WorkspaceSnapshot["files"] = {};
	const omissions: SnapshotOmission[] = [];
	let totalBytes = 0;

	for (const path of Object.keys(files).sort()) {
		const content = files[path];
		const bytes = new TextEncoder().encode(content).byteLength;
		let reason: SnapshotOmission["reason"] | undefined;

		if (isSecretPath(path)) reason = "secret";
		else if (isBlockedPath(path)) reason = "blocked-path";
		else if (looksBinary(content)) reason = "binary";
		else if (bytes > limits.maxFileBytes) reason = "file-too-large";
		else if (Object.keys(snapshotFiles).length >= limits.maxFiles) {
			reason = "too-many-files";
		} else if (totalBytes + bytes > limits.maxTotalBytes) {
			reason = "snapshot-too-large";
		}

		if (reason) {
			omissions.push({ path, reason, bytes });
			continue;
		}

		snapshotFiles[path] = { content, hash: hashText(content) };
		totalBytes += bytes;
	}

	return {
		snapshot: {
			revision: computeWorkspaceRevision(files),
			files: snapshotFiles,
		},
		omissions,
		totalBytes,
	};
}

function failure(
	code: ApplyFailure["code"],
	message: string,
	failedPaths: string[] = [],
): ApplyFailure {
	return { ok: false, code, message, failedPaths };
}

function selectedChanges(
	changeSet: WorkspaceChangeSet,
	selection?: ChangeSelection,
): WorkspaceChange[] | ApplyFailure {
	if (!selection?.changeIndices) return changeSet.changes;
	const uniqueIndices = [...new Set(selection.changeIndices)].sort(
		(a, b) => a - b,
	);
	if (
		uniqueIndices.length === 0 ||
		uniqueIndices.some(
			(index) =>
				!Number.isInteger(index) ||
				index < 0 ||
				index >= changeSet.changes.length,
		)
	) {
		return failure(
			"INVALID_CHANGESET",
			"Change selection must contain valid change indices",
		);
	}
	return uniqueIndices.map((index) => changeSet.changes[index]);
}

export function prepareWorkspaceTransaction(
	inputFiles: WorkspaceFiles,
	changeSet: WorkspaceChangeSet,
	selection?: ChangeSelection,
): PreparedWorkspaceTransaction | ApplyFailure {
	const files = normalizeWorkspaceFiles(inputFiles);
	const previousRevision = computeWorkspaceRevision(files);

	const changes = selectedChanges(changeSet, selection);
	if (!Array.isArray(changes)) return changes;
	const normalizedChanges: WorkspaceChange[] = [];
	const seenPaths = new Set<string>();

	for (const change of changes) {
		let path: string;
		try {
			path = normalizeWorkspacePath(change.path);
		} catch (error) {
			return failure(
				"INVALID_CHANGESET",
				error instanceof Error ? error.message : "Invalid workspace path",
				[change.path],
			);
		}
		if (seenPaths.has(path)) {
			return failure(
				"INVALID_CHANGESET",
				`ChangeSet contains duplicate path ${path}`,
				[path],
			);
		}
		seenPaths.add(path);
		normalizedChanges.push({ ...change, path } as WorkspaceChange);
	}

	for (const change of normalizedChanges) {
		const currentContent = files[change.path];
		if (change.op === "create") {
			if (currentContent !== undefined || change.beforeHash !== null) {
				return failure(
					"PATH_CONFLICT",
					`Cannot create existing path ${change.path}`,
					[change.path],
				);
			}
			continue;
		}

		if (currentContent === undefined) {
			return failure(
				"PATH_CONFLICT",
				`Cannot ${change.op} missing path ${change.path}`,
				[change.path],
			);
		}
		if (hashText(currentContent) !== change.beforeHash) {
			return failure(
				"HASH_CONFLICT",
				`File changed after inspection: ${change.path}`,
				[change.path],
			);
		}
	}

	const nextFiles = { ...files };
	const inverseChanges: WorkspaceChange[] = [];
	for (const change of normalizedChanges) {
		const previousContent = nextFiles[change.path];
		if (change.op === "create") {
			nextFiles[change.path] = change.content;
			inverseChanges.push({
				op: "delete",
				path: change.path,
				beforeHash: hashText(change.content),
			});
		} else if (change.op === "update") {
			nextFiles[change.path] = change.content;
			inverseChanges.push({
				op: "update",
				path: change.path,
				beforeHash: hashText(change.content),
				content: previousContent,
			});
		} else {
			delete nextFiles[change.path];
			inverseChanges.push({
				op: "create",
				path: change.path,
				beforeHash: null,
				content: previousContent,
			});
		}
	}

	const revision = computeWorkspaceRevision(nextFiles);
	return {
		files: nextFiles,
		previousRevision,
		revision,
		affectedPaths: normalizedChanges.map((change) => change.path),
		inverse: {
			id: `undo:${changeSet.id}`,
			baseRevision: revision,
			summary: `Undo: ${changeSet.summary}`,
			changes: inverseChanges,
		},
	};
}

function lineStats(beforeContent: string, afterContent: string) {
	let additions = 0;
	let deletions = 0;
	for (const part of diffLines(beforeContent, afterContent)) {
		if (part.added) additions += part.count ?? 0;
		if (part.removed) deletions += part.count ?? 0;
	}
	return { additions, deletions };
}

export function createChangePreview(
	inputFiles: WorkspaceFiles,
	changeSet: WorkspaceChangeSet,
	selection?: ChangeSelection,
): ChangePreview {
	const files = normalizeWorkspaceFiles(inputFiles);
	const prepared = prepareWorkspaceTransaction(files, changeSet, selection);
	if ("ok" in prepared) return prepared;

	const previewFiles: ChangePreviewFile[] = prepared.affectedPaths.map(
		(path) => {
			const beforeContent = files[path];
			const afterContent = prepared.files[path];
			const op: WorkspaceChange["op"] =
				beforeContent === undefined
					? "create"
					: afterContent === undefined
						? "delete"
						: "update";
			const stats = lineStats(beforeContent ?? "", afterContent ?? "");
			return {
				path,
				op,
				beforeContent,
				afterContent,
				beforeHash:
					beforeContent === undefined ? null : hashText(beforeContent),
				afterHash: afterContent === undefined ? null : hashText(afterContent),
				...stats,
			};
		},
	);

	return {
		ok: true,
		changeSetId: changeSet.id,
		summary: changeSet.summary,
		files: previewFiles,
		additions: previewFiles.reduce((total, file) => total + file.additions, 0),
		deletions: previewFiles.reduce((total, file) => total + file.deletions, 0),
	};
}
