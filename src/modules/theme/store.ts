import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
	ResolvedTheme,
	ThemeMode,
	ThemeState,
} from "@/modules/theme/types";

const THEME_STORAGE_KEY = "mini-lovable-theme";

const THEME_MODES: ThemeMode[] = [
	"day",
	"night",
	"summer",
	"drizzle",
	"breeze",
	"snow",
];

// Helper to get system theme, used to migrate legacy "auto" preferences
const getSystemTheme = (): ResolvedTheme => {
	if (typeof window === "undefined") return "dark";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

const resolveTheme = (mode: ThemeMode): ResolvedTheme =>
	mode === "night" ? "dark" : "light";

const getRandomMode = (): ThemeMode =>
	THEME_MODES[Math.floor(Math.random() * THEME_MODES.length)] ?? "night";

const getPersistedMode = (state: unknown): unknown =>
	typeof state === "object" && state !== null && "mode" in state
		? state.mode
		: undefined;

// Older versions persisted light, dark, or auto; fold them into explicit modes.
const normalizeMode = (mode: unknown): ThemeMode => {
	if (THEME_MODES.includes(mode as ThemeMode)) return mode as ThemeMode;
	if (mode === "light") return "day";
	if (mode === "dark") return "night";
	return getSystemTheme() === "dark" ? "night" : "day";
};

// Apply theme to document
const applyTheme = (theme: ResolvedTheme, mode: ThemeMode) => {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	root.setAttribute("data-theme", theme);
	// The full mode stays available so per-mode palettes (e.g. Snow's wintry
	// blue) can override tokens without touching the light/dark scheme.
	root.setAttribute("data-mode", mode);
	root.classList.toggle("dark", theme === "dark");

	// Update meta color-scheme for OS integration
	root.style.colorScheme = theme;
};

export const useThemeStore = create<ThemeState>()(
	persist(
		(set) => ({
			mode: "night", // Default to dark to match current behavior
			resolvedTheme: "dark",

			setMode: (mode: ThemeMode) => {
				const resolvedTheme = resolveTheme(mode);
				set({ mode, resolvedTheme });
				applyTheme(resolvedTheme, mode);
			},
		}),
		{
			name: THEME_STORAGE_KEY,
			version: 1,
			partialize: (state) => ({ mode: state.mode }), // Only persist mode preference
			migrate: (persistedState) => ({
				mode: normalizeMode(getPersistedMode(persistedState)),
			}),
			merge: (persistedState, currentState) => {
				const mode =
					persistedState === undefined
						? getRandomMode()
						: normalizeMode(getPersistedMode(persistedState));
				return {
					...currentState,
					mode,
					resolvedTheme: resolveTheme(mode),
				};
			},
			onRehydrateStorage: () => (state) => {
				// When storage loads, apply the theme immediately
				if (state) {
					applyTheme(state.resolvedTheme, state.mode);
				}
			},
		},
	),
);

// Initial application to prevent flash (can be called in main entry)
export const initTheme = () => {
	const state = useThemeStore.getState();
	applyTheme(state.resolvedTheme, state.mode);
};
