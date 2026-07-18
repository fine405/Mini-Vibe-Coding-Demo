import Editor from "@monaco-editor/react";
import { useCallback } from "react";
import {
	defineMonacoThemes,
	getMonacoTheme,
} from "@/modules/editor/monaco-theme";
import { useThemeStore } from "@/modules/theme/store";

interface MonacoEditorProps {
	value: string;
	language?: string;
	onChange?: (value: string) => void;
	readOnly?: boolean;
}

export function MonacoEditorWrapper({
	value,
	language,
	onChange,
	readOnly = false,
}: MonacoEditorProps) {
	const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
	const handleChange = useCallback(
		(newValue: string | undefined) => {
			if (onChange && newValue !== undefined) {
				onChange(newValue);
			}
		},
		[onChange],
	);

	return (
		<Editor
			height="100%"
			language={language}
			value={value}
			beforeMount={defineMonacoThemes}
			onChange={handleChange}
			theme={getMonacoTheme(resolvedTheme)}
			options={{
				readOnly,
				minimap: { enabled: false },
				fontSize: 13,
				lineNumbers: "on",
				scrollBeyondLastLine: false,
				automaticLayout: true,
				tabSize: 2,
				wordWrap: "on",
				padding: { top: 8 },
			}}
		/>
	);
}
