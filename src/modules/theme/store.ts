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

// Older versions persisted light, dark, or auto; fold them into explicit modes.
const normalizeMode = (mode: unknown): ThemeMode => {
	if (THEME_MODES.includes(mode as ThemeMode)) return mode as ThemeMode;
	if (mode === "light") return "day";
	if (mode === "dark") return "night";
	return getSystemTheme() === "dark" ? "night" : "day";
};

// Apply theme to document
const applyTheme = (theme: ResolvedTheme) => {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	root.setAttribute("data-theme", theme);
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
				applyTheme(resolvedTheme);
			},
		}),
		{
			name: THEME_STORAGE_KEY,
			partialize: (state) => ({ mode: state.mode }), // Only persist mode preference
			onRehydrateStorage: () => (state) => {
				// When storage loads, apply the theme immediately
				if (state) {
					const hasStoredPreference =
						typeof window !== "undefined" &&
						window.localStorage.getItem(THEME_STORAGE_KEY) !== null;
					const mode = hasStoredPreference
						? normalizeMode(state.mode)
						: getRandomMode();
					state.setMode(mode);
				}
			},
		},
	),
);

// Initial application to prevent flash (can be called in main entry)
export const initTheme = () => {
	const state = useThemeStore.getState();
	const mode = normalizeMode(state.mode);
	const resolvedTheme = resolveTheme(mode);
	useThemeStore.setState({ mode, resolvedTheme });
	applyTheme(resolvedTheme);
};
