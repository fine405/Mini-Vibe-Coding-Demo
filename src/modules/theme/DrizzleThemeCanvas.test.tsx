import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DrizzleThemeCanvas } from "@/modules/theme/DrizzleThemeCanvas";
import { useThemeStore } from "@/modules/theme/store";

describe("DrizzleThemeCanvas", () => {
	beforeEach(() => {
		useThemeStore.setState({ mode: "night", resolvedTheme: "dark" });
	});

	afterEach(() => vi.restoreAllMocks());

	it("renders a non-interactive fullscreen canvas that is hidden outside Drizzle", () => {
		render(<DrizzleThemeCanvas />);
		const canvas = screen.getByTestId("drizzle-theme-canvas");

		expect(canvas).toHaveAttribute("aria-hidden", "true");
		expect(canvas).toHaveClass(
			"pointer-events-none",
			"fixed",
			"inset-0",
			"z-40",
			"opacity-0",
		);
		expect(canvas).not.toHaveClass("opacity-100");
	});

	it("fades in when Drizzle becomes active and survives without a 2D context", async () => {
		const raf = vi.spyOn(window, "requestAnimationFrame");
		render(<DrizzleThemeCanvas />);
		const canvas = screen.getByTestId("drizzle-theme-canvas");

		act(() => useThemeStore.getState().setMode("drizzle"));
		expect(canvas).toHaveClass("opacity-100");

		// jsdom has no Canvas 2D context: the dynamic scene import must
		// resolve without throwing, and no animation loop may be scheduled.
		await waitFor(() => expect(raf).not.toHaveBeenCalled());

		act(() => useThemeStore.getState().setMode("night"));
		expect(canvas).toHaveClass("opacity-0");
	});
});
