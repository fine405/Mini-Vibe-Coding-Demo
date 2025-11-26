import Editor from "@monaco-editor/react";
import { useCallback } from "react";

interface MonacoEditorProps {
	value: string;
	language?: string;
	onChange?: (value: string) => void;
	readOnly?: boolean;
}

/**
 * Get Monaco language from file path
 */
function getLanguageFromPath(path: string): string {
	const ext = path.split(".").pop()?.toLowerCase();
	const languageMap: Record<string, string> = {
		js: "javascript",
		jsx: "javascript",
		ts: "typescript",
		tsx: "typescript",
		json: "json",
		html: "html",
		css: "css",
		scss: "scss",
		less: "less",
		md: "markdown",
		yaml: "yaml",
		yml: "yaml",
		xml: "xml",
		py: "python",
		rb: "ruby",
		go: "go",
		rs: "rust",
		java: "java",
		c: "c",
		cpp: "cpp",
		h: "c",
		hpp: "cpp",
		sh: "shell",
		bash: "shell",
		sql: "sql",
		graphql: "graphql",
		vue: "vue",
		svelte: "svelte",
	};
	return languageMap[ext || ""] || "plaintext";
}

export function MonacoEditorWrapper({
	value,
	language,
	onChange,
	readOnly = false,
}: MonacoEditorProps) {
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
			theme="vs-dark"
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

export { getLanguageFromPath };
