import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { clearWorkspace, loadWorkspace, saveWorkspace } from "./persistence";
import type { VirtualFile, VirtualFileSystemState } from "./types";

const INITIAL_FILES: Record<string, VirtualFile> = {
	"/index.js": {
		path: "/index.js",
		status: "clean",
		content:
			"import React from 'react';\n" +
			"import { createRoot } from 'react-dom/client';\n" +
			"import App from './App';\n" +
			"const root = createRoot(document.getElementById('root'));\n" +
			"root.render(<App />);\n",
	},
	"/App.js": {
		path: "/App.js",
		status: "clean",
		content:
			"import React from 'react';\n" +
			"export default function App(){\n" +
			"  return (<div style={{ padding: 16 }}><h1>Hello from virtual FS</h1></div>);\n" +
			"}\n",
	},
};

const cloneInitialFiles = (): Record<string, VirtualFile> =>
	Object.fromEntries(
		Object.entries(INITIAL_FILES).map(([path, file]) => [path, { ...file }]),
	);

interface FsStore extends VirtualFileSystemState {
	activeFilePath: string | null;
	setFiles: (files: Record<string, VirtualFile>) => void;
	updateFileContent: (path: string, content: string) => void;
	createFile: (path: string, content?: string) => void;
	deleteFile: (path: string) => void;
	renameFile: (oldPath: string, newPath: string) => void;
	resetFs: () => void;
	setActiveFile: (path: string | null) => void;
	loadFromPersistence: () => Promise<boolean>;
	saveToIndexedDB: () => Promise<void>;
}

const stateCreator = immer<FsStore>((set) => ({
	filesByPath: cloneInitialFiles(),
	activeFilePath: null,
	setFiles(files) {
		set({ filesByPath: files });
		// Auto-save to IndexedDB
		saveWorkspace(files).catch(console.error);
	},
	setActiveFile(path) {
		set({ activeFilePath: path });
	},
	updateFileContent(path, content) {
		set((state) => {
			const existing = state.filesByPath[path];
			if (!existing) return;
			existing.content = content;
			existing.status = "modified";
		});
		// Auto-save to IndexedDB
		const state = useFs.getState();
		saveWorkspace(state.filesByPath).catch(console.error);
	},
	createFile(path, content = "") {
		set((state) => {
			state.filesByPath[path] = {
				path,
				content,
				status: "new",
			};
		});
		// Auto-save to IndexedDB
		const state = useFs.getState();
		saveWorkspace(state.filesByPath).catch(console.error);
	},
	deleteFile(path) {
		set((state) => {
			if (state.filesByPath[path]) {
				delete state.filesByPath[path];
			}
		});
		// Auto-save to IndexedDB
		const state = useFs.getState();
		saveWorkspace(state.filesByPath).catch(console.error);
	},
	renameFile(oldPath, newPath) {
		set((state) => {
			const existing = state.filesByPath[oldPath];
			if (!existing || oldPath === newPath) return;
			delete state.filesByPath[oldPath];
			state.filesByPath[newPath] = {
				...existing,
				path: newPath,
				status: existing.status === "new" ? "new" : "modified",
			};
		});
		// Auto-save to IndexedDB
		const state = useFs.getState();
		saveWorkspace(state.filesByPath).catch(console.error);
	},
	resetFs() {
		set({ filesByPath: cloneInitialFiles() });
		// Clear IndexedDB when resetting
		clearWorkspace().catch(console.error);
	},
	async loadFromPersistence() {
		try {
			const data = await loadWorkspace();
			if (data?.filesByPath) {
				set({ filesByPath: data.filesByPath });
				return true;
			}
			return false;
		} catch (error) {
			console.error("Failed to load from persistence:", error);
			return false;
		}
	},
	async saveToIndexedDB() {
		const state = useFs.getState();
		await saveWorkspace(state.filesByPath);
	},
}));

export const useFs = import.meta.env.DEV
	? create<FsStore>()(
			devtools(stateCreator, {
				name: "fs-store",
			}),
		)
	: create<FsStore>()(stateCreator);
