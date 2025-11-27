import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ResolvedTheme, ThemeMode, ThemeState } from "./types";

const THEME_STORAGE_KEY = "mini-lovable-theme";

// Helper to get system theme
const getSystemTheme = (): ResolvedTheme => {
	if (typeof window === "undefined") return "dark";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

// Helper to resolve theme based on mode
const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
	if (mode === "auto") return getSystemTheme();
	return mode;
};

// Apply theme to document
const applyTheme = (theme: ResolvedTheme) => {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	root.setAttribute("data-theme", theme);

	// Update meta color-scheme for OS integration
	root.style.colorScheme = theme;
};

export const useThemeStore = create<ThemeState>()(
	persist(
		(set, get) => {
			// Initialize system listener when matchMedia is available (browser only)
			if (
				typeof window !== "undefined" &&
				typeof window.matchMedia === "function"
			) {
				const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
				const handleChange = () => {
					const { mode } = get();
					if (mode === "auto") {
						const newTheme = getSystemTheme();
						set({ resolvedTheme: newTheme });
						applyTheme(newTheme);
					}
				};
				mediaQuery.addEventListener("change", handleChange);
			}

			return {
				mode: "dark", // Default to dark to match current behavior
				resolvedTheme: "dark",

				setMode: (mode: ThemeMode) => {
					const resolvedTheme = resolveTheme(mode);
					set({ mode, resolvedTheme });
					applyTheme(resolvedTheme);
				},
			};
		},
		{
			name: THEME_STORAGE_KEY,
			partialize: (state) => ({ mode: state.mode }), // Only persist mode preference
			onRehydrateStorage: () => (state) => {
				// When storage loads, apply the theme immediately
				if (state) {
					const resolvedTheme = resolveTheme(state.mode);
					state.resolvedTheme = resolvedTheme;
					applyTheme(resolvedTheme);
				}
			},
		},
	),
);

// Initial application to prevent flash (can be called in main entry)
export const initTheme = () => {
	const state = useThemeStore.getState();
	const resolvedTheme = resolveTheme(state.mode);
	useThemeStore.setState({ resolvedTheme });
	applyTheme(resolvedTheme);
};
