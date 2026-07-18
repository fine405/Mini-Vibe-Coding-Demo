import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SummerThemeMedia } from "@/modules/theme/SummerThemeMedia";
import { useThemeStore } from "@/modules/theme/store";

describe("SummerThemeMedia", () => {
	beforeEach(() => {
		useThemeStore.setState({ mode: "night", resolvedTheme: "dark" });
		vi.restoreAllMocks();
	});

	afterAll(() => vi.restoreAllMocks());

	it("plays and resets the paired Summer media without intercepting input", async () => {
		const play = vi
			.spyOn(HTMLMediaElement.prototype, "play")
			.mockResolvedValue();
		const pause = vi
			.spyOn(HTMLMediaElement.prototype, "pause")
			.mockImplementation(() => undefined);
		const { container, unmount } = render(<SummerThemeMedia />);
		const video = container.querySelector("video");
		const audio = container.querySelector("audio");

		expect(video).not.toBeNull();
		expect(audio).not.toBeNull();
		expect(video).toHaveAttribute("loop");
		expect(video).toHaveAttribute("playsinline");
		expect(video).toHaveAttribute("preload", "none");
		expect(video).toHaveProperty("muted", true);
		expect(video).toHaveClass("pointer-events-none", "mix-blend-multiply");
		expect(audio).toHaveAttribute("loop");
		expect(audio).toHaveAttribute("preload", "none");

		act(() => useThemeStore.getState().setMode("summer"));
		await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
		expect(video).toHaveClass("opacity-100");

		if (video && audio) {
			video.currentTime = 4;
			audio.currentTime = 9;
		}
		act(() => useThemeStore.getState().setMode("night"));
		expect(pause).toHaveBeenCalledTimes(2);
		expect(video).toHaveProperty("currentTime", 0);
		expect(audio).toHaveProperty("currentTime", 0);
		expect(video).toHaveClass("opacity-0");

		act(() => useThemeStore.getState().setMode("summer"));
		await waitFor(() => expect(play).toHaveBeenCalledTimes(4));
		if (video && audio) {
			video.currentTime = 3;
			audio.currentTime = 5;
		}
		unmount();
		expect(pause).toHaveBeenCalledTimes(4);
		expect(video).toHaveProperty("currentTime", 0);
		expect(audio).toHaveProperty("currentTime", 0);
	});

	it("keeps the visual active and retries blocked Summer audio on interaction", async () => {
		const play = vi
			.spyOn(HTMLMediaElement.prototype, "play")
			.mockImplementation(function (this: HTMLMediaElement) {
				return this instanceof HTMLAudioElement
					? Promise.reject(new Error("autoplay blocked"))
					: Promise.resolve();
			});
		vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
			() => undefined,
		);
		useThemeStore.setState({ mode: "summer", resolvedTheme: "light" });
		const { container } = render(<SummerThemeMedia />);
		const video = container.querySelector("video");

		await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
		expect(video).toHaveClass("opacity-100");

		fireEvent.pointerDown(window);
		await waitFor(() => expect(play).toHaveBeenCalledTimes(3));
	});
});
