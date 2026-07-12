export type WorkspaceFiles = Record<string, string>;

export interface WorkspaceSnapshotFile {
	content: string;
	hash: string;
}

export interface WorkspaceSnapshot {
	revision: string;
	files: Record<string, WorkspaceSnapshotFile>;
}

export type SnapshotOmissionReason =
	| "secret"
	| "blocked-path"
	| "binary"
	| "file-too-large"
	| "too-many-files"
	| "snapshot-too-large";

export interface SnapshotOmission {
	path: string;
	reason: SnapshotOmissionReason;
	bytes: number;
}

export interface SnapshotOptions {
	maxFiles?: number;
	maxFileBytes?: number;
	maxTotalBytes?: number;
}

export interface SnapshotPreflight {
	snapshot: WorkspaceSnapshot;
	omissions: SnapshotOmission[];
	totalBytes: number;
}

export interface WorkspaceRepository {
	read(): Promise<WorkspaceFiles>;
	write(files: WorkspaceFiles): Promise<void>;
}

export type WorkspaceChange =
	| {
			op: "create";
			path: string;
			beforeHash: null;
			content: string;
	  }
	| {
			op: "update";
			path: string;
			beforeHash: string;
			content: string;
	  }
	| {
			op: "delete";
			path: string;
			beforeHash: string;
	  };

export interface WorkspaceChangeSet {
	id: string;
	baseRevision: string;
	summary: string;
	changes: WorkspaceChange[];
}

export interface ChangeSelection {
	changeIndices?: number[];
	hunkIndicesByChange?: Record<number, number[]>;
}

export type ApplyFailureCode =
	| "STALE_REVISION"
	| "INVALID_CHANGESET"
	| "PATH_CONFLICT"
	| "HASH_CONFLICT";

export interface ApplyFailure {
	ok: false;
	code: ApplyFailureCode;
	message: string;
	failedPaths: string[];
}

export interface ApplySuccess {
	ok: true;
	transactionId: string;
	previousRevision: string;
	revision: string;
	affectedPaths: string[];
}

export type ApplyResult = ApplyFailure | ApplySuccess;

export interface ChangePreviewFile {
	path: string;
	op: WorkspaceChange["op"];
	beforeContent?: string;
	afterContent?: string;
	beforeHash: string | null;
	afterHash: string | null;
	additions: number;
	deletions: number;
}

export interface ChangePreviewSuccess {
	ok: true;
	changeSetId: string;
	summary: string;
	files: ChangePreviewFile[];
	additions: number;
	deletions: number;
}

export type ChangePreview = ApplyFailure | ChangePreviewSuccess;

export interface PreparedWorkspaceTransaction {
	files: WorkspaceFiles;
	previousRevision: string;
	revision: string;
	affectedPaths: string[];
	inverse: WorkspaceChangeSet;
}

export type UndoResult =
	| {
			ok: true;
			revision: string;
			affectedPaths: string[];
	  }
	| {
			ok: false;
			code: "TRANSACTION_NOT_FOUND" | "UNDO_CONFLICT";
			message: string;
	  };
