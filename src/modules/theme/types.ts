export type ThemeMode = "dark" | "light" | "auto";
export type ResolvedTheme = "dark" | "light";

export interface ThemeState {
	mode: ThemeMode;
	resolvedTheme: ResolvedTheme;
	setMode: (mode: ThemeMode) => void;
}
