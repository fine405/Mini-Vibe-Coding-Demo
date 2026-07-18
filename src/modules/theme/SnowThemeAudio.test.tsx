import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SnowThemeAudio } from "@/modules/theme/SnowThemeAudio";
import { useThemeStore } from "@/modules/theme/store";

describe("SnowThemeAudio", () => {
	beforeEach(() => {
		useThemeStore.setState({ mode: "night", resolvedTheme: "dark" });
		vi.restoreAllMocks();
	});

	afterAll(() => vi.restoreAllMocks());

	it("plays and resets the looped ambience with the Snow theme", async () => {
		const play = vi
			.spyOn(HTMLMediaElement.prototype, "play")
			.mockResolvedValue();
		const pause = vi
			.spyOn(HTMLMediaElement.prototype, "pause")
			.mockImplementation(() => undefined);
		const { container, unmount } = render(<SnowThemeAudio />);
		const audio = container.querySelector("audio");

		expect(audio).not.toBeNull();
		expect(audio).toHaveAttribute("loop");
		expect(audio).toHaveAttribute("preload", "none");
		expect(audio).toHaveAttribute("src", "/themes/snow-christmas.mp3");
		expect(audio).toHaveProperty("volume", 0.5);

		act(() => useThemeStore.getState().setMode("snow"));
		await waitFor(() => expect(play).toHaveBeenCalledOnce());

		if (audio) audio.currentTime = 12;
		act(() => useThemeStore.getState().setMode("day"));
		expect(pause).toHaveBeenCalledOnce();
		expect(audio).toHaveProperty("currentTime", 0);

		act(() => useThemeStore.getState().setMode("snow"));
		await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
		if (audio) audio.currentTime = 8;
		unmount();
		expect(pause).toHaveBeenCalledTimes(2);
		expect(audio).toHaveProperty("currentTime", 0);
	});

	it("retries blocked Snow audio on the next interaction", async () => {
		const play = vi
			.spyOn(HTMLMediaElement.prototype, "play")
			.mockRejectedValue(new Error("autoplay blocked"));
		vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
			() => undefined,
		);
		useThemeStore.setState({ mode: "snow", resolvedTheme: "light" });
		render(<SnowThemeAudio />);

		await waitFor(() => expect(play).toHaveBeenCalledOnce());
		fireEvent.pointerDown(window);
		await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
	});
});
