import Editor from "@monaco-editor/react";
import { useCallback } from "react";
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
	const { mode } = useThemeStore();
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
			onChange={handleChange}
			theme={mode === "dark" ? "vs-dark" : "vs-light"}
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
