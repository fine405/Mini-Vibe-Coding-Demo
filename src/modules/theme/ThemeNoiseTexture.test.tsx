import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useThemeStore } from "@/modules/theme/store";
import { ThemeNoiseTexture } from "@/modules/theme/ThemeNoiseTexture";

describe("ThemeNoiseTexture", () => {
	beforeEach(() => {
		useThemeStore.setState({ mode: "night", resolvedTheme: "dark" });
	});

	it("uses a pre-rendered noise texture for Night and Day", () => {
		render(<ThemeNoiseTexture />);
		const texture = screen.getByTestId("theme-noise-texture");

		expect(texture).toHaveAttribute("aria-hidden", "true");
		expect(texture).toHaveClass(
			"pointer-events-none",
			"theme-noise-texture",
			"opacity-10",
		);
		expect(texture).toBeEmptyDOMElement();

		act(() => useThemeStore.getState().setMode("day"));
		expect(texture).toHaveClass("opacity-15");
		expect(texture).not.toHaveClass("opacity-10");
	});

	it.each(["summer", "drizzle", "breeze", "snow"] as const)(
		"stays hidden for %s",
		(mode) => {
			useThemeStore.setState({ mode, resolvedTheme: "light" });
			render(<ThemeNoiseTexture />);

			expect(screen.getByTestId("theme-noise-texture")).toHaveClass(
				"opacity-0",
			);
		},
	);
});
