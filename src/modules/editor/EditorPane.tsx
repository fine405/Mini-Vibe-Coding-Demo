import { FileCode2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useFs } from "@/modules/fs/store";
import { EditorDiffView } from "./EditorDiffView";
import { EditorTabs } from "./EditorTabs";
import { getLanguageFromPath, MonacoEditorWrapper } from "./MonacoEditor";
import { useEditor } from "./store";

export function EditorPane() {
	const { filesByPath, revertFile } = useFs();
	const updateFileContent = useFs((s) => s.updateFileContent);
	const [revertDialogOpen, setRevertDialogOpen] = useState(false);
	const [fileToRevert, setFileToRevert] = useState<string | null>(null);
	const revertButtonRef = useRef<HTMLButtonElement>(null);

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
				updateFileContent(activeFilePath, newContent);
			}
		},
		[activeFilePath, updateFileContent],
	);

	const getFileStatus = useCallback(
		(path: string) => {
			return filesByPath[path]?.status || "clean";
		},
		[filesByPath],
	);

	const getOriginalContent = useCallback(
		(path: string) => {
			const file = filesByPath[path];
			// Return stored original content, or current content if none
			return file?.originalContent ?? file?.content ?? "";
		},
		[filesByPath],
	);

	const handleRevert = useCallback((path: string) => {
		setFileToRevert(path);
		setRevertDialogOpen(true);
	}, []);

	const confirmRevert = useCallback(() => {
		if (fileToRevert) {
			revertFile(fileToRevert);
		}
		setRevertDialogOpen(false);
		setFileToRevert(null);
	}, [fileToRevert, revertFile]);

	useEffect(() => {
		if (revertDialogOpen) {
			setTimeout(() => {
				revertButtonRef.current?.focus();
			}, 0);
		}
	}, [revertDialogOpen]);

	const canRevert = useCallback(
		(path: string) => {
			const file = filesByPath[path];
			return file?.status === "modified" && file?.originalContent !== undefined;
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
				onRevert={handleRevert}
				canRevert={canRevert}
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

			{/* Revert Confirmation Dialog */}
			<Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Revert Changes</DialogTitle>
						<DialogDescription>
							Are you sure you want to revert{" "}
							<span className="font-mono text-neutral-300">{fileToRevert}</span>
							? All changes will be discarded.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<button
							type="button"
							onClick={() => setRevertDialogOpen(false)}
							className="px-3 py-1.5 text-sm rounded hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-neutral-200"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={confirmRevert}
							ref={revertButtonRef}
							className="px-3 py-1.5 text-sm rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 font-medium transition-colors"
						>
							Revert
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
