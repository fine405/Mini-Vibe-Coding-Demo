import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useThemeStore } from "@/modules/theme/store";
import type { ResolvedTheme, ThemeMode } from "@/modules/theme/types";

const originalMatchMedia = window.matchMedia;

function mockSystemTheme(theme: ResolvedTheme) {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn().mockReturnValue({
			matches: theme === "dark",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}),
	});
}

describe("theme store", () => {
	beforeEach(() => {
		localStorage.clear();
		useThemeStore.setState({ mode: "night", resolvedTheme: "dark" });
		localStorage.clear();
		document.documentElement.className = "";
		document.documentElement.removeAttribute("data-theme");
		mockSystemTheme("light");
	});

	afterAll(() => {
		Object.defineProperty(window, "matchMedia", {
			configurable: true,
			value: originalMatchMedia,
		});
	});

	it.each<[ThemeMode, ResolvedTheme]>([
		["day", "light"],
		["night", "dark"],
		["summer", "light"],
		["drizzle", "light"],
		["breeze", "light"],
	])(
		"selecting %s preserves the mode and applies %s",
		(mode, resolvedTheme) => {
			useThemeStore.getState().setMode(mode);

			expect(useThemeStore.getState()).toMatchObject({ mode, resolvedTheme });
			expect(document.documentElement).toHaveAttribute(
				"data-theme",
				resolvedTheme,
			);
			expect(document.documentElement.classList.contains("dark")).toBe(
				resolvedTheme === "dark",
			);
		},
	);

	it.each([
		["light", "day", "light"],
		["dark", "night", "dark"],
	] as const)(
		"migrates legacy %s preferences to %s",
		async (legacyMode, mode, resolvedTheme) => {
			localStorage.setItem(
				"mini-lovable-theme",
				JSON.stringify({ state: { mode: legacyMode }, version: 0 }),
			);

			await useThemeStore.persist.rehydrate();

			expect(useThemeStore.getState()).toMatchObject({ mode, resolvedTheme });
			expect(document.documentElement).toHaveAttribute(
				"data-theme",
				resolvedTheme,
			);
			expect(
				JSON.parse(localStorage.getItem("mini-lovable-theme") ?? "null"),
			).toMatchObject({ state: { mode } });
		},
	);

	it("migrates legacy auto once from the current system preference", async () => {
		mockSystemTheme("light");
		localStorage.setItem(
			"mini-lovable-theme",
			JSON.stringify({ state: { mode: "auto" }, version: 0 }),
		);

		await useThemeStore.persist.rehydrate();

		expect(useThemeStore.getState()).toMatchObject({
			mode: "day",
			resolvedTheme: "light",
		});
		expect(
			JSON.parse(localStorage.getItem("mini-lovable-theme") ?? "null"),
		).toMatchObject({ state: { mode: "day" } });
	});
});
