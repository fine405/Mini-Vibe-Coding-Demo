import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { clearWorkspace, loadWorkspace, saveWorkspace } from "./persistence";
import type { VirtualFile, VirtualFileSystemState } from "./types";

const INITIAL_FILES: Record<string, VirtualFile> = {
	"/package.json": {
		path: "/package.json",
		status: "clean",
		content: `{
  "name": "react-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
`,
	},
	"/index.html": {
		path: "/index.html",
		status: "clean",
		content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
	},
	"/src/index.js": {
		path: "/src/index.js",
		status: "clean",
		content: `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
	},
	"/src/App.js": {
		path: "/src/App.js",
		status: "clean",
		content: `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <h1>Hello React</h1>
      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>
          count is {count}
        </button>
      </div>
      <p className="hint">
        Edit <code>src/App.js</code> and save to see changes
      </p>
    </div>
  );
}
`,
	},
	"/src/styles.css": {
		path: "/src/styles.css",
		status: "clean",
		content: `:root {
  font-family: Inter, system-ui, sans-serif;
  line-height: 1.5;
  color: #213547;
  background-color: #ffffff;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

#root {
  padding: 2rem;
  text-align: center;
}

.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

h1 {
  font-size: 2.5rem;
}

.card {
  padding: 1rem;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #f9f9f9;
  cursor: pointer;
  transition: border-color 0.2s;
}

button:hover {
  border-color: #646cff;
}

.hint {
  color: #888;
}

code {
  background: #f4f4f5;
  padding: 0.2em 0.4em;
  border-radius: 4px;
}
`,
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
	deleteDirectory: (dirPath: string) => void;
	renameDirectory: (oldDirPath: string, newDirPath: string) => void;
	resetFs: () => void;
	setActiveFile: (path: string | null) => void;
	loadFromPersistence: () => Promise<boolean>;
	saveToIndexedDB: () => Promise<void>;
	acceptAllChanges: () => void;
	revertFile: (path: string) => void;
	revertAllChanges: () => void;
	getModifiedFiles: () => string[];
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
			if (existing.content === content) {
				return;
			}
			// Store original content on first modification
			if (
				existing.status === "clean" &&
				existing.originalContent === undefined
			) {
				existing.originalContent = existing.content;
			}
			existing.content = content;
			if (
				existing.originalContent !== undefined &&
				existing.content === existing.originalContent
			) {
				existing.status = "clean";
				delete existing.originalContent;
			} else {
				existing.status = "modified";
			}
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
	deleteDirectory(dirPath) {
		set((state) => {
			const prefix = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;
			for (const path of Object.keys(state.filesByPath)) {
				if (path.startsWith(prefix)) {
					delete state.filesByPath[path];
				}
			}
		});
		const state = useFs.getState();
		saveWorkspace(state.filesByPath).catch(console.error);
	},
	renameDirectory(oldDirPath, newDirPath) {
		set((state) => {
			if (oldDirPath === newDirPath) return;
			const prefix = oldDirPath.endsWith("/") ? oldDirPath : `${oldDirPath}/`;
			const newPrefix = newDirPath.endsWith("/")
				? newDirPath
				: `${newDirPath}/`;
			const toRename: Array<{ oldPath: string; newPath: string }> = [];
			for (const path of Object.keys(state.filesByPath)) {
				if (path.startsWith(prefix)) {
					const relativePath = path.slice(prefix.length);
					toRename.push({
						oldPath: path,
						newPath: `${newPrefix}${relativePath}`,
					});
				}
			}
			for (const { oldPath, newPath } of toRename) {
				const existing = state.filesByPath[oldPath];
				if (existing) {
					delete state.filesByPath[oldPath];
					state.filesByPath[newPath] = {
						...existing,
						path: newPath,
						status: existing.status === "new" ? "new" : "modified",
					};
				}
			}
		});
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
	acceptAllChanges() {
		set((state) => {
			for (const path in state.filesByPath) {
				if (state.filesByPath[path].status !== "clean") {
					state.filesByPath[path].status = "clean";
					// Clear original content since changes are accepted
					delete state.filesByPath[path].originalContent;
				}
			}
		});
		// Auto-save to IndexedDB
		const state = useFs.getState();
		saveWorkspace(state.filesByPath).catch(console.error);
	},
	revertFile(path) {
		set((state) => {
			const existing = state.filesByPath[path];
			if (!existing || existing.status !== "modified") return;
			if (existing.originalContent !== undefined) {
				existing.content = existing.originalContent;
				existing.status = "clean";
				delete existing.originalContent;
			}
		});
		// Auto-save to IndexedDB
		const state = useFs.getState();
		saveWorkspace(state.filesByPath).catch(console.error);
	},
	revertAllChanges() {
		set((state) => {
			for (const path in state.filesByPath) {
				const file = state.filesByPath[path];
				if (file.originalContent !== undefined) {
					// Revert to original content (works for both "modified" and "new" with changes)
					file.content = file.originalContent;
					// Keep status as "new" if it was new, otherwise set to "clean"
					if (file.status !== "new") {
						file.status = "clean";
					}
					delete file.originalContent;
				} else if (file.status === "new") {
					// Delete new files that have no original content (first-time creation)
					delete state.filesByPath[path];
				}
			}
		});
		// Auto-save to IndexedDB
		const state = useFs.getState();
		saveWorkspace(state.filesByPath).catch(console.error);
	},
	getModifiedFiles(): string[] {
		const { filesByPath } = useFs.getState();
		return Object.keys(filesByPath).filter(
			(path) =>
				(filesByPath[path].status === "modified" &&
					filesByPath[path].originalContent !== undefined) ||
				filesByPath[path].status === "new",
		);
	},
}));

export const useFs = import.meta.env.DEV
	? create<FsStore>()(
			devtools(stateCreator, {
				name: "fs-store",
			}),
		)
	: create<FsStore>()(stateCreator);
