import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
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
	setFiles: (files: Record<string, VirtualFile>) => void;
	updateFileContent: (path: string, content: string) => void;
	createFile: (path: string, content?: string) => void;
	deleteFile: (path: string) => void;
	renameFile: (oldPath: string, newPath: string) => void;
	resetFs: () => void;
}

const stateCreator = immer<FsStore>((set) => ({
	filesByPath: cloneInitialFiles(),
	setFiles(files) {
		set({ filesByPath: files });
	},
	updateFileContent(path, content) {
		set((state) => {
			const existing = state.filesByPath[path];
			if (!existing) return;
			existing.content = content;
			existing.status = "modified";
		});
	},
	createFile(path, content = "") {
		set((state) => {
			state.filesByPath[path] = {
				path,
				content,
				status: "new",
			};
		});
	},
	deleteFile(path) {
		set((state) => {
			if (state.filesByPath[path]) {
				delete state.filesByPath[path];
			}
		});
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
	},
	resetFs() {
		set({ filesByPath: cloneInitialFiles() });
	},
}));

export const useFs = import.meta.env.DEV
	? create<FsStore>()(
			devtools(stateCreator, {
				name: "fs-store",
			}),
		)
	: create<FsStore>()(stateCreator);
