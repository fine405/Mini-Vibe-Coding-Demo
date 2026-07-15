import { DiffEditor, type MonacoDiffEditor } from "@monaco-editor/react";
import { useCallback, useEffect, useRef } from "react";
import { useThemeStore } from "@/modules/theme/store";

interface EditorDiffViewProps {
	originalContent: string;
	modifiedContent: string;
	language?: string;
	inline?: boolean;
}

export function EditorDiffView({
	originalContent,
	modifiedContent,
	language,
	inline = false,
}: EditorDiffViewProps) {
	const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
	const modelsRef = useRef<ReturnType<MonacoDiffEditor["getModel"]>>(null);
	const handleMount = useCallback((editor: MonacoDiffEditor) => {
		modelsRef.current = editor.getModel();
	}, []);

	useEffect(
		() => () => {
			const models = modelsRef.current;
			modelsRef.current = null;
			if (!models) return;
			queueMicrotask(() => {
				for (const model of [models.original, models.modified]) {
					if (!model.isDisposed()) model.dispose();
				}
			});
		},
		[],
	);

	const inlineTheme = resolvedTheme === "dark" ? "vs-dark" : "vs-light";
	return (
		<DiffEditor
			height="100%"
			keepCurrentModifiedModel
			keepCurrentOriginalModel
			language={language}
			modified={modifiedContent}
			onMount={handleMount}
			options={{
				readOnly: true,
				minimap: { enabled: false },
				fontSize: 13,
				scrollBeyondLastLine: false,
				automaticLayout: true,
				renderSideBySide: !inline,
				renderOverviewRuler: !inline,
				hideUnchangedRegions: inline
					? {
							enabled: true,
							contextLineCount: 3,
							minimumLineCount: 6,
							revealLineCount: 3,
						}
					: { enabled: false },
				padding: inline ? { top: 8, bottom: 72 } : { top: 8 },
			}}
			original={originalContent}
			theme={inline ? inlineTheme : "vs-dark"}
		/>
	);
}
