import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DrizzleThemeAudio } from "@/modules/theme/DrizzleThemeAudio";
import {
	DRIZZLE_AUDIO_VOLUME,
	DRIZZLE_THUNDER_RANGES,
	getDrizzleVisualState,
} from "@/modules/theme/drizzleAudio";
import { useThemeStore } from "@/modules/theme/store";

describe("DrizzleThemeAudio", () => {
	beforeEach(() => {
		useThemeStore.setState({ mode: "night", resolvedTheme: "dark" });
		vi.restoreAllMocks();
	});

	afterAll(() => vi.restoreAllMocks());

	it("plays and resets the looped rain ambience with the Drizzle theme", async () => {
		const play = vi
			.spyOn(HTMLMediaElement.prototype, "play")
			.mockResolvedValue();
		const pause = vi
			.spyOn(HTMLMediaElement.prototype, "pause")
			.mockImplementation(() => undefined);
		const { container, unmount } = render(<DrizzleThemeAudio />);
		const audio = container.querySelector("audio");

		expect(audio).not.toBeNull();
		expect(audio).toHaveAttribute("loop");
		expect(audio).toHaveAttribute("preload", "none");
		expect(audio).toHaveAttribute("src", "/themes/drizzle-rain.mp3");
		expect(audio).toHaveProperty("volume", DRIZZLE_AUDIO_VOLUME);

		act(() => useThemeStore.getState().setMode("drizzle"));
		await waitFor(() => expect(play).toHaveBeenCalledOnce());

		if (audio) audio.currentTime = 12;
		act(() => useThemeStore.getState().setMode("day"));
		expect(pause).toHaveBeenCalledOnce();
		expect(audio).toHaveProperty("currentTime", 0);

		act(() => useThemeStore.getState().setMode("drizzle"));
		await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
		if (audio) audio.currentTime = 8;
		unmount();
		expect(pause).toHaveBeenCalledTimes(2);
		expect(audio).toHaveProperty("currentTime", 0);
	});

	it("exposes the analyzed thunder ranges for synchronized effects", () => {
		expect(DRIZZLE_THUNDER_RANGES).toEqual([
			{ startSeconds: 12, endSeconds: 17.4, truncatedByClip: false },
			{ startSeconds: 22.3, endSeconds: 25, truncatedByClip: false },
			{ startSeconds: 26, endSeconds: 38, truncatedByClip: false },
			{ startSeconds: 44.9, endSeconds: 60, truncatedByClip: true },
		]);
	});

	it("maps the audio timeline to a fuller rain entrance and visible lightning", () => {
		const intro = getDrizzleVisualState(0);
		const settled = getDrizzleVisualState(8);
		const quiet = getDrizzleVisualState(20);
		const thunder = getDrizzleVisualState(30);
		const primaryFlash = getDrizzleVisualState(12.08);
		const returnFlash = getDrizzleVisualState(12.34);

		expect(intro.intensity).toBeGreaterThan(0.3);
		expect(settled.intensity).toBeGreaterThan(0.85);
		expect(thunder.thunder).toBeGreaterThan(0.9);
		expect(thunder.windBoost).toBeGreaterThan(quiet.windBoost);
		expect(primaryFlash.lightning).toBeGreaterThan(0.9);
		expect(returnFlash.lightning).toBeGreaterThan(0.35);
		expect(quiet.lightning).toBe(0);
	});

	it("retries blocked Drizzle audio on the next interaction", async () => {
		const play = vi
			.spyOn(HTMLMediaElement.prototype, "play")
			.mockRejectedValue(new Error("autoplay blocked"));
		vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
			() => undefined,
		);
		useThemeStore.setState({ mode: "drizzle", resolvedTheme: "light" });
		render(<DrizzleThemeAudio />);

		await waitFor(() => expect(play).toHaveBeenCalledOnce());
		fireEvent.pointerDown(window);
		await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
	});
});
