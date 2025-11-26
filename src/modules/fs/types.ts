export type FileStatus = "clean" | "new" | "modified";

export interface VirtualFile {
	path: string;
	content: string;
	status: FileStatus;
	/** Original content before modifications, used for revert and diff */
	originalContent?: string;
}

export interface VirtualFileSystemState {
	filesByPath: Record<string, VirtualFile>;
}
