import type { Monaco } from "@monaco-editor/react";
import type { ResolvedTheme } from "@/modules/theme/types";

export const MONACO_DARK_THEME = "ml-dark";
export const MONACO_LIGHT_THEME = "ml-light";

let themesDefined = false;

/**
 * Custom Monaco themes that blend seamlessly with the app surface tokens
 * (pure black editor in dark mode, pure white in light mode).
 */
export function defineMonacoThemes(monaco: Monaco) {
	if (themesDefined) return;
	themesDefined = true;

	monaco.editor.defineTheme(MONACO_DARK_THEME, {
		base: "vs-dark",
		inherit: true,
		rules: [],
		colors: {
			"editor.background": "#000000",
			"editorGutter.background": "#000000",
			"editor.lineHighlightBackground": "#0a0a0a",
			"editorLineNumber.foreground": "#3d3d3d",
			"editorLineNumber.activeForeground": "#a1a1a1",
			"editorIndentGuide.background1": "#1f1f1f",
			"editorIndentGuide.activeBackground1": "#2e2e2e",
			"editorWidget.background": "#0a0a0a",
			"editorWidget.border": "#1f1f1f",
			"editorSuggestWidget.background": "#0a0a0a",
			"editorSuggestWidget.border": "#1f1f1f",
			"editorHoverWidget.background": "#0a0a0a",
			"editorHoverWidget.border": "#1f1f1f",
			"diffEditor.insertedTextBackground": "#22c55e1f",
			"diffEditor.removedTextBackground": "#ef44441f",
			"diffEditor.insertedLineBackground": "#22c55e14",
			"diffEditor.removedLineBackground": "#ef444414",
			"diffEditor.diagonalFill": "#3d3d3d",
		},
	});

	monaco.editor.defineTheme(MONACO_LIGHT_THEME, {
		base: "vs",
		inherit: true,
		rules: [],
		colors: {
			"editor.background": "#ffffff",
			"editorGutter.background": "#ffffff",
			"editor.lineHighlightBackground": "#fafafa",
			"editorLineNumber.foreground": "#c2c2c2",
			"editorLineNumber.activeForeground": "#5c5c5c",
			"editorIndentGuide.background1": "#f0f0f0",
			"editorIndentGuide.activeBackground1": "#e0e0e0",
			"editorWidget.border": "#eaeaea",
			"editorSuggestWidget.border": "#eaeaea",
			"editorHoverWidget.border": "#eaeaea",
			"diffEditor.insertedTextBackground": "#22c55e24",
			"diffEditor.removedTextBackground": "#ef444424",
			"diffEditor.insertedLineBackground": "#22c55e14",
			"diffEditor.removedLineBackground": "#ef444414",
			"diffEditor.diagonalFill": "#c2c2c2",
		},
	});
}

export function getMonacoTheme(resolvedTheme: ResolvedTheme) {
	return resolvedTheme === "dark" ? MONACO_DARK_THEME : MONACO_LIGHT_THEME;
}
