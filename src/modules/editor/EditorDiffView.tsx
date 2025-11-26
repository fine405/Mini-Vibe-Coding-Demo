import { DiffEditor } from "@monaco-editor/react";

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
	return (
		<DiffEditor
			height="100%"
			language={language}
			original={originalContent}
			modified={modifiedContent}
			theme="vs-dark"
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
