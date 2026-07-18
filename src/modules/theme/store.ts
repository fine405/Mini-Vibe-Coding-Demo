import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
	ResolvedTheme,
	ThemeMode,
	ThemeState,
} from "@/modules/theme/types";

const THEME_STORAGE_KEY = "mini-lovable-theme";

// Helper to get system theme, used to migrate legacy "auto" preferences
const getSystemTheme = (): ResolvedTheme => {
	if (typeof window === "undefined") return "dark";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

// Older versions persisted "auto" as a mode; fold it into a concrete theme
const normalizeMode = (mode: unknown): ThemeMode => {
	if (mode === "light" || mode === "dark") return mode;
	return getSystemTheme();
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
			mode: "dark", // Default to dark to match current behavior
			resolvedTheme: "dark",

			setMode: (mode: ThemeMode) => {
				set({ mode, resolvedTheme: mode });
				applyTheme(mode);
			},
		}),
		{
			name: THEME_STORAGE_KEY,
			partialize: (state) => ({ mode: state.mode }), // Only persist mode preference
			onRehydrateStorage: () => (state) => {
				// When storage loads, apply the theme immediately
				if (state) {
					const mode = normalizeMode(state.mode);
					state.mode = mode;
					state.resolvedTheme = mode;
					applyTheme(mode);
				}
			},
		},
	),
);

// Initial application to prevent flash (can be called in main entry)
export const initTheme = () => {
	const state = useThemeStore.getState();
	const mode = normalizeMode(state.mode);
	useThemeStore.setState({ mode, resolvedTheme: mode });
	applyTheme(mode);
};
