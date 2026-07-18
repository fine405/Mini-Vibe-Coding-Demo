export type ThemeMode =
	| "day"
	| "night"
	| "summer"
	| "drizzle"
	| "breeze"
	| "snow";
export type ResolvedTheme = "dark" | "light";

export interface ThemeState {
	mode: ThemeMode;
	resolvedTheme: ResolvedTheme;
	setMode: (mode: ThemeMode) => void;
}
