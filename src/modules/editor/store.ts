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
}));

export const useEditor = import.meta.env.DEV
	? create<EditorStore>()(
			devtools(stateCreator, {
				name: "editor-store",
			}),
		)
	: create<EditorStore>()(stateCreator);
