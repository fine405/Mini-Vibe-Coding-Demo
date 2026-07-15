import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	selectReviewableAgentPaths,
	useAgentChangeSessionStore,
} from "@/modules/agent-chat/change-session";
import { AgentChangeToolbar } from "@/modules/editor/AgentChangeToolbar";
import { EditorDiffView } from "@/modules/editor/EditorDiffView";
import { EditorEmptyState } from "@/modules/editor/EditorEmptyState";
import { EditorTabs } from "@/modules/editor/EditorTabs";
import { getLanguageFromPath } from "@/modules/editor/language";
import { MonacoEditorWrapper } from "@/modules/editor/MonacoEditor";
import { RevertDialog } from "@/modules/editor/RevertDialog";
import { useEditor } from "@/modules/editor/store";
import {
	browserWorkspace,
	useBrowserWorkspaceFiles,
} from "@/modules/workspace/browser";

export function EditorPane() {
	const filesByPath = useBrowserWorkspaceFiles();
	const [revertDialogOpen, setRevertDialogOpen] = useState(false);
	const [fileToRevert, setFileToRevert] = useState<string | null>(null);
	const changesByPath = useAgentChangeSessionStore(
		(state) => state.changesByPath,
	);
	const orderedPaths = useAgentChangeSessionStore(
		(state) => state.orderedPaths,
	);
	const discardedPaths = useAgentChangeSessionStore(
		(state) => state.discardedPaths,
	);
	const changeSet = useAgentChangeSessionStore((state) => state.changeSet);
	const reviewSelections = useAgentChangeSessionStore(
		(state) => state.reviewSelections,
	);
	const sessionActivePath = useAgentChangeSessionStore(
		(state) => state.activePath,
	);
	const {
		openFiles,
		activeFilePath,
		closeFile,
		setActiveFile,
		toggleViewMode,
	} = useEditor();

	const activeFile = activeFilePath ? filesByPath[activeFilePath] : null;
	const activeOpenFile = openFiles.find((file) => file.path === activeFilePath);
	const reviewablePaths = useMemo(
		() =>
			selectReviewableAgentPaths({
				changeSet,
				changesByPath,
				discardedPaths,
				orderedPaths,
				reviewSelections,
			}),
		[changeSet, changesByPath, discardedPaths, orderedPaths, reviewSelections],
	);
	const agentChange =
		activeFilePath && reviewablePaths.includes(activeFilePath)
			? changesByPath[activeFilePath]
			: null;
	const toolbarPath =
		agentChange && activeFilePath
			? activeFilePath
			: sessionActivePath && reviewablePaths.includes(sessionActivePath)
				? sessionActivePath
				: (reviewablePaths[0] ?? null);
	const previousActivePathRef = useRef(activeFilePath);
	const wasAgentChangeRef = useRef(Boolean(agentChange));
	const previousAgentChangesRef = useRef(changesByPath);

	useEffect(() => {
		if (agentChange && activeFilePath) {
			useAgentChangeSessionStore.getState().setActivePath(activeFilePath);
		}
	}, [activeFilePath, agentChange]);

	useEffect(() => {
		const pathStayedActive = previousActivePathRef.current === activeFilePath;
		const lostCurrentDraft = wasAgentChangeRef.current && !agentChange;
		previousActivePathRef.current = activeFilePath;
		wasAgentChangeRef.current = Boolean(agentChange);
		if (
			!pathStayedActive ||
			!lostCurrentDraft ||
			!activeFilePath ||
			!sessionActivePath ||
			sessionActivePath === activeFilePath
		) {
			return;
		}
		if (changesByPath[activeFilePath]?.op === "create") {
			closeFile(activeFilePath);
		}
		useEditor.getState().openFile(sessionActivePath);
	}, [
		activeFilePath,
		agentChange,
		changesByPath,
		closeFile,
		sessionActivePath,
	]);

	useEffect(() => {
		const previousChanges = previousAgentChangesRef.current;
		previousAgentChangesRef.current = changesByPath;
		for (const [path, change] of Object.entries(previousChanges)) {
			if (
				change.op === "create" &&
				changesByPath[path] === undefined &&
				filesByPath[path] === undefined
			) {
				closeFile(path);
			}
		}
	}, [changesByPath, closeFile, filesByPath]);

	const handleContentChange = useCallback(
		(content: string) => {
			if (activeFilePath) {
				void browserWorkspace.updateFileContent(activeFilePath, content);
			}
		},
		[activeFilePath],
	);
	const getFileStatus = useCallback(
		(path: string) => filesByPath[path]?.status ?? "clean",
		[filesByPath],
	);
	const getOriginalContent = useCallback(
		(path: string) => {
			const file = filesByPath[path];
			return file?.originalContent ?? file?.content ?? "";
		},
		[filesByPath],
	);
	const handleRevert = useCallback((path: string) => {
		setFileToRevert(path);
		setRevertDialogOpen(true);
	}, []);
	const confirmRevert = useCallback(() => {
		if (!fileToRevert) return;
		void browserWorkspace.revertFile(fileToRevert).then(() => {
			setRevertDialogOpen(false);
			setFileToRevert(null);
		});
	}, [fileToRevert]);
	const canRevert = useCallback(
		(path: string) => {
			const file = filesByPath[path];
			return file?.status === "modified" && file.originalContent !== undefined;
		},
		[filesByPath],
	);

	if (openFiles.length === 0) {
		if (!toolbarPath) return <EditorEmptyState />;
		return (
			<div className="agent-change-review-surface relative h-full w-full">
				<EditorEmptyState />
				<AgentChangeToolbar activePath={toolbarPath} paths={reviewablePaths} />
			</div>
		);
	}

	const language = activeFilePath
		? getLanguageFromPath(activeFilePath)
		: "plaintext";
	const showDiff = Boolean(
		activeOpenFile?.viewMode === "diff" &&
			activeFile &&
			activeFile.status !== "clean",
	);

	return (
		<div
			id="tour-editor"
			className="flex h-full w-full flex-col bg-bg-primary text-fg-primary"
		>
			<EditorTabs
				activeFilePath={activeFilePath}
				canRevert={canRevert}
				getFileStatus={getFileStatus}
				onCloseTab={closeFile}
				onRevert={handleRevert}
				onSelectTab={setActiveFile}
				onToggleViewMode={toggleViewMode}
				openFiles={openFiles}
			/>
			<div className="agent-change-review-surface relative flex-1 overflow-hidden">
				{agentChange && activeFilePath ? (
					<EditorDiffView
						inline
						language={language}
						modifiedContent={agentChange.content}
						originalContent={agentChange.originalContent}
					/>
				) : activeFile && activeFilePath ? (
					showDiff ? (
						<EditorDiffView
							language={language}
							modifiedContent={activeFile.content}
							originalContent={getOriginalContent(activeFilePath)}
						/>
					) : (
						<MonacoEditorWrapper
							language={language}
							onChange={handleContentChange}
							value={activeFile.content}
						/>
					)
				) : (
					<div className="flex h-full items-center justify-center text-sm text-fg-muted">
						File not found
					</div>
				)}
				{toolbarPath ? (
					<AgentChangeToolbar
						activePath={toolbarPath}
						paths={reviewablePaths}
					/>
				) : null}
			</div>
			<RevertDialog
				filePath={fileToRevert}
				onConfirm={confirmRevert}
				onOpenChange={setRevertDialogOpen}
				open={revertDialogOpen}
			/>
		</div>
	);
}
