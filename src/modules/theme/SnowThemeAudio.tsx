import { useEffect, useRef } from "react";
import { useThemeStore } from "@/modules/theme/store";

const SNOW_AUDIO_SRC = "/themes/snow-christmas.mp3";
const SNOW_AUDIO_VOLUME = 0.5;

const playAudio = (audio: HTMLAudioElement, onRejected: () => void) => {
	try {
		const playback = audio.play();
		if (playback) void playback.catch(onRejected);
	} catch {
		onRejected();
	}
};

export function SnowThemeAudio() {
	const mode = useThemeStore((state) => state.mode);
	const audioRef = useRef<HTMLAudioElement>(null);
	const isSnowRef = useRef(false);
	const audioBlockedRef = useRef(false);
	const isSnow = mode === "snow";

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		audio.volume = SNOW_AUDIO_VOLUME;
		isSnowRef.current = isSnow;
		audioBlockedRef.current = false;
		if (!isSnow) return;

		playAudio(audio, () => {
			if (isSnowRef.current) audioBlockedRef.current = true;
		});

		return () => {
			isSnowRef.current = false;
			audioBlockedRef.current = false;
			audio.pause();
			audio.currentTime = 0;
		};
	}, [isSnow]);

	useEffect(() => {
		const retryBlockedAudio = () => {
			const audio = audioRef.current;
			if (!audio || !isSnowRef.current || !audioBlockedRef.current) return;

			audioBlockedRef.current = false;
			playAudio(audio, () => {
				if (isSnowRef.current) audioBlockedRef.current = true;
			});
		};

		window.addEventListener("pointerdown", retryBlockedAudio);
		window.addEventListener("keydown", retryBlockedAudio);
		return () => {
			window.removeEventListener("pointerdown", retryBlockedAudio);
			window.removeEventListener("keydown", retryBlockedAudio);
		};
	}, []);

	return (
		<audio
			aria-hidden="true"
			hidden
			loop
			preload="none"
			ref={audioRef}
			src={SNOW_AUDIO_SRC}
		/>
	);
}
