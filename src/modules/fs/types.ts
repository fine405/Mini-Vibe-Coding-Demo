export type FileStatus = "clean" | "new" | "modified";

export interface VirtualFile {
  path: string;
  content: string;
  status: FileStatus;
}

export interface VirtualFileSystemState {
  filesByPath: Record<string, VirtualFile>;
}
