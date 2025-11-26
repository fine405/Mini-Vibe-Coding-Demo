export type ViewMode = "editor" | "diff";

export interface OpenFile {
	path: string;
	viewMode: ViewMode;
}

export interface EditorState {
	openFiles: OpenFile[];
	activeFilePath: string | null;
}
