import { FileCode2 } from "lucide-react";
import { useCallback } from "react";
import { useFs } from "@/modules/fs/store";
import { EditorDiffView } from "./EditorDiffView";
import { EditorTabs } from "./EditorTabs";
import { getLanguageFromPath, MonacoEditorWrapper } from "./MonacoEditor";
import { useEditor } from "./store";

// Store original content for diff view
const originalContentCache = new Map<string, string>();

export function EditorPane() {
	const { filesByPath } = useFs();
	const updateFileContent = useFs((s) => s.updateFileContent);

	const {
		openFiles,
		activeFilePath,
		closeFile,
		setActiveFile,
		toggleViewMode,
	} = useEditor();

	const activeFile = activeFilePath ? filesByPath[activeFilePath] : null;
	const activeOpenFile = openFiles.find((f) => f.path === activeFilePath);

	const handleContentChange = useCallback(
		(newContent: string) => {
			if (activeFilePath) {
				// Cache original content before first edit
				if (!originalContentCache.has(activeFilePath)) {
					const file = filesByPath[activeFilePath];
					if (file && file.status === "clean") {
						originalContentCache.set(activeFilePath, file.content);
					}
				}
				updateFileContent(activeFilePath, newContent);
			}
		},
		[activeFilePath, filesByPath, updateFileContent],
	);

	const getFileStatus = useCallback(
		(path: string) => {
			return filesByPath[path]?.status || "clean";
		},
		[filesByPath],
	);

	const getOriginalContent = useCallback(
		(path: string) => {
			// Return cached original content, or current content if no cache
			return originalContentCache.get(path) || filesByPath[path]?.content || "";
		},
		[filesByPath],
	);

	// Render empty state
	if (openFiles.length === 0) {
		return (
			<div className="h-full w-full flex flex-col bg-neutral-950 text-neutral-100">
				<div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 border-b border-neutral-800/60">
					Editor
				</div>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center text-neutral-500">
						<FileCode2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
						<p className="text-sm">No file open</p>
						<p className="text-xs mt-1">Select a file from the tree to edit</p>
					</div>
				</div>
			</div>
		);
	}

	const language = activeFilePath
		? getLanguageFromPath(activeFilePath)
		: "plaintext";
	const showDiff =
		activeOpenFile?.viewMode === "diff" &&
		activeFile &&
		activeFile.status !== "clean";

	return (
		<div className="h-full w-full flex flex-col bg-neutral-950 text-neutral-100">
			{/* Tabs */}
			<EditorTabs
				openFiles={openFiles}
				activeFilePath={activeFilePath}
				onSelectTab={setActiveFile}
				onCloseTab={closeFile}
				onToggleViewMode={toggleViewMode}
				getFileStatus={getFileStatus}
			/>

			{/* Editor content */}
			<div className="flex-1 overflow-hidden">
				{activeFile && activeFilePath ? (
					showDiff ? (
						<EditorDiffView
							originalContent={getOriginalContent(activeFilePath)}
							modifiedContent={activeFile.content}
							language={language}
						/>
					) : (
						<MonacoEditorWrapper
							value={activeFile.content}
							language={language}
							onChange={handleContentChange}
						/>
					)
				) : (
					<div className="h-full flex items-center justify-center text-neutral-500 text-sm">
						File not found
					</div>
				)}
			</div>
		</div>
	);
}
