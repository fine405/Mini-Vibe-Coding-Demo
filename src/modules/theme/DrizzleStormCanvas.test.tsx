import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DrizzleStormCanvas } from "@/modules/theme/DrizzleStormCanvas";
import { useThemeStore } from "@/modules/theme/store";

describe("DrizzleStormCanvas", () => {
	beforeEach(() => {
		useThemeStore.setState({ mode: "night", resolvedTheme: "dark" });
	});

	afterEach(() => vi.restoreAllMocks());

	it("renders the storm light below the Canvas 2D rain layer", () => {
		render(<DrizzleStormCanvas />);
		const canvas = screen.getByTestId("drizzle-storm-canvas");

		expect(canvas).toHaveAttribute("aria-hidden", "true");
		expect(canvas).toHaveClass(
			"pointer-events-none",
			"fixed",
			"inset-0",
			"z-[35]",
			"mix-blend-screen",
			"opacity-0",
		);
		expect(canvas).not.toHaveClass("opacity-100");
	});

	it("fades in for Drizzle and keeps the theme usable without WebGL", async () => {
		const raf = vi.spyOn(window, "requestAnimationFrame");
		render(<DrizzleStormCanvas />);
		const canvas = screen.getByTestId("drizzle-storm-canvas");

		act(() => useThemeStore.getState().setMode("drizzle"));
		expect(canvas).toHaveClass("opacity-100");

		// jsdom has no WebGL. Scene creation must bail out without scheduling
		// an animation loop, leaving the independent Canvas 2D rain layer intact.
		await waitFor(() => expect(raf).not.toHaveBeenCalled());

		act(() => useThemeStore.getState().setMode("night"));
		expect(canvas).toHaveClass("opacity-0");
	});
});
