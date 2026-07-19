import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { initTheme, useThemeStore } from "@/modules/theme/store";
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

	afterEach(() => vi.restoreAllMocks());

	it("chooses a random theme without persisting it when no preference exists", async () => {
		vi.spyOn(Math, "random").mockReturnValue(0.99);

		await useThemeStore.persist.rehydrate();
		initTheme();

		expect(useThemeStore.getState()).toMatchObject({
			mode: "snow",
			resolvedTheme: "light",
		});
		expect(localStorage.getItem("mini-lovable-theme")).toBeNull();
	});

	it("persists a theme after the user explicitly selects it", async () => {
		vi.spyOn(Math, "random").mockReturnValue(0.99);
		await useThemeStore.persist.rehydrate();
		initTheme();
		expect(localStorage.getItem("mini-lovable-theme")).toBeNull();

		useThemeStore.getState().setMode("day");

		expect(
			JSON.parse(localStorage.getItem("mini-lovable-theme") ?? "null"),
		).toMatchObject({ state: { mode: "day" }, version: 1 });
	});

	it("restores an existing theme preference without choosing a random one", async () => {
		localStorage.setItem(
			"mini-lovable-theme",
			JSON.stringify({ state: { mode: "breeze" }, version: 0 }),
		);
		const random = vi.spyOn(Math, "random");

		await useThemeStore.persist.rehydrate();

		expect(useThemeStore.getState()).toMatchObject({
			mode: "breeze",
			resolvedTheme: "light",
		});
		expect(random).not.toHaveBeenCalled();
	});

	it.each<[ThemeMode, ResolvedTheme]>([
		["day", "light"],
		["night", "dark"],
		["summer", "light"],
		["drizzle", "dark"],
		["breeze", "light"],
		["snow", "light"],
	])(
		"selecting %s preserves the mode and applies %s",
		(mode, resolvedTheme) => {
			useThemeStore.getState().setMode(mode);

			expect(useThemeStore.getState()).toMatchObject({ mode, resolvedTheme });
			expect(document.documentElement).toHaveAttribute(
				"data-theme",
				resolvedTheme,
			);
			expect(document.documentElement).toHaveAttribute("data-mode", mode);
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
