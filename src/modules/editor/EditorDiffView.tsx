import { DiffEditor, type DiffOnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef } from "react";
import { useChatStore } from "@/modules/chat/store";

type DiffEditorInstance = Parameters<DiffOnMount>[0];
type LineChange = NonNullable<
	ReturnType<DiffEditorInstance["getLineChanges"]>
>[number];

interface EditorDiffViewProps {
	originalContent: string;
	modifiedContent: string;
	language?: string;
}

export function EditorDiffView({
	originalContent,
	modifiedContent,
	language,
}: EditorDiffViewProps) {
	const diffEditorRef = useRef<DiffEditorInstance | null>(null);
	const diffChangesRef = useRef<LineChange[]>([]);
	const { reviewState, setTotalHunks } = useChatStore();
	const { currentHunkIndex } = reviewState;

	const handleEditorDidMount: DiffOnMount = useCallback(
		(editor) => {
			diffEditorRef.current = editor;

			// Get diff changes after a short delay to ensure diff is computed
			setTimeout(() => {
				const changes = editor.getLineChanges();
				if (changes) {
					diffChangesRef.current = changes;
					setTotalHunks(changes.length);
				}
			}, 100);
		},
		[setTotalHunks],
	);

	// Scroll to the current hunk when it changes
	useEffect(() => {
		const editor = diffEditorRef.current;
		if (!editor) return;

		// Get current changes
		const changes = editor.getLineChanges();
		if (!changes || changes.length === 0) return;

		diffChangesRef.current = changes;

		// Get the target change
		const targetChange = changes[currentHunkIndex];
		if (!targetChange) return;

		// Get the modified editor and scroll to the change
		const modifiedEditor = editor.getModifiedEditor();
		const lineNumber = targetChange.modifiedStartLineNumber || 1;

		modifiedEditor.revealLineInCenter(lineNumber);
	}, [currentHunkIndex]);

	return (
		<DiffEditor
			height="100%"
			language={language}
			original={originalContent}
			modified={modifiedContent}
			theme="vs-dark"
			onMount={handleEditorDidMount}
			options={{
				readOnly: true,
				minimap: { enabled: false },
				fontSize: 13,
				scrollBeyondLastLine: false,
				automaticLayout: true,
				renderSideBySide: true,
				padding: { top: 8 },
			}}
		/>
	);
}
