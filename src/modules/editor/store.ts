import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { OpenFile, ViewMode } from "./types";

interface EditorStore {
	openFiles: OpenFile[];
	activeFilePath: string | null;

	openFile: (path: string) => void;
	closeFile: (path: string) => void;
	setActiveFile: (path: string | null) => void;
	toggleViewMode: (path: string) => void;
	setViewMode: (path: string, mode: ViewMode) => void;
	closeAllFiles: () => void;
	closeFilesInDirectory: (dirPath: string) => void;
	renameOpenFile: (oldPath: string, newPath: string) => void;
	renameOpenFilesInDirectory: (oldDirPath: string, newDirPath: string) => void;
}

const stateCreator = immer<EditorStore>((set) => ({
	openFiles: [],
	activeFilePath: null,

	openFile(path: string) {
		set((state) => {
			const existing = state.openFiles.find((f) => f.path === path);
			if (!existing) {
				state.openFiles.push({ path, viewMode: "editor" });
			}
			state.activeFilePath = path;
		});
	},

	closeFile(path: string) {
		set((state) => {
			const index = state.openFiles.findIndex((f) => f.path === path);
			if (index === -1) return;

			state.openFiles.splice(index, 1);

			// If closing the active file, switch to another tab
			if (state.activeFilePath === path) {
				if (state.openFiles.length > 0) {
					// Prefer the tab to the left, or the first one
					const newIndex = Math.min(index, state.openFiles.length - 1);
					state.activeFilePath = state.openFiles[newIndex].path;
				} else {
					state.activeFilePath = null;
				}
			}
		});
	},

	setActiveFile(path: string | null) {
		set({ activeFilePath: path });
	},

	toggleViewMode(path: string) {
		set((state) => {
			const file = state.openFiles.find((f) => f.path === path);
			if (file) {
				file.viewMode = file.viewMode === "editor" ? "diff" : "editor";
			}
		});
	},

	setViewMode(path: string, mode: ViewMode) {
		set((state) => {
			const file = state.openFiles.find((f) => f.path === path);
			if (file) {
				file.viewMode = mode;
			}
		});
	},

	closeAllFiles() {
		set({ openFiles: [], activeFilePath: null });
	},

	closeFilesInDirectory(dirPath: string) {
		set((state) => {
			const prefix = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;
			state.openFiles = state.openFiles.filter(
				(f) => !f.path.startsWith(prefix),
			);
			if (state.activeFilePath?.startsWith(prefix)) {
				state.activeFilePath =
					state.openFiles.length > 0 ? state.openFiles[0].path : null;
			}
		});
	},

	renameOpenFile(oldPath: string, newPath: string) {
		set((state) => {
			const file = state.openFiles.find((f) => f.path === oldPath);
			if (file) {
				file.path = newPath;
			}
			if (state.activeFilePath === oldPath) {
				state.activeFilePath = newPath;
			}
		});
	},

	renameOpenFilesInDirectory(oldDirPath: string, newDirPath: string) {
		set((state) => {
			const oldPrefix = oldDirPath.endsWith("/")
				? oldDirPath
				: `${oldDirPath}/`;
			const newPrefix = newDirPath.endsWith("/")
				? newDirPath
				: `${newDirPath}/`;
			for (const file of state.openFiles) {
				if (file.path.startsWith(oldPrefix)) {
					file.path = `${newPrefix}${file.path.slice(oldPrefix.length)}`;
				}
			}
			if (state.activeFilePath?.startsWith(oldPrefix)) {
				state.activeFilePath = `${newPrefix}${state.activeFilePath.slice(oldPrefix.length)}`;
			}
		});
	},
}));

export const useEditor = import.meta.env.DEV
	? create<EditorStore>()(
			devtools(stateCreator, {
				name: "editor-store",
			}),
		)
	: create<EditorStore>()(stateCreator);
