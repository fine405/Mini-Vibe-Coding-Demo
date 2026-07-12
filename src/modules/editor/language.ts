/** Get the Monaco language identifier for a workspace path. */
export function getLanguageFromPath(path: string): string {
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
	return languageMap[ext ?? ""] ?? "plaintext";
}
