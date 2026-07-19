import { useEffect, useRef } from "react";
import {
	DRIZZLE_AUDIO_SRC,
	DRIZZLE_AUDIO_VOLUME,
	registerDrizzleAudio,
} from "@/modules/theme/drizzleAudio";
import { useThemeStore } from "@/modules/theme/store";

const playAudio = (audio: HTMLAudioElement, onRejected: () => void) => {
	try {
		const playback = audio.play();
		if (playback) void playback.catch(onRejected);
	} catch {
		onRejected();
	}
};

export function DrizzleThemeAudio() {
	const mode = useThemeStore((state) => state.mode);
	const audioRef = useRef<HTMLAudioElement>(null);
	const isDrizzleRef = useRef(false);
	const audioBlockedRef = useRef(false);
	const isDrizzle = mode === "drizzle";

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		return registerDrizzleAudio(audio);
	}, []);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		audio.volume = DRIZZLE_AUDIO_VOLUME;
		isDrizzleRef.current = isDrizzle;
		audioBlockedRef.current = false;
		if (!isDrizzle) return;

		playAudio(audio, () => {
			if (isDrizzleRef.current) audioBlockedRef.current = true;
		});

		return () => {
			isDrizzleRef.current = false;
			audioBlockedRef.current = false;
			audio.pause();
			audio.currentTime = 0;
		};
	}, [isDrizzle]);

	useEffect(() => {
		const retryBlockedAudio = () => {
			const audio = audioRef.current;
			if (!audio || !isDrizzleRef.current || !audioBlockedRef.current) return;

			audioBlockedRef.current = false;
			playAudio(audio, () => {
				if (isDrizzleRef.current) audioBlockedRef.current = true;
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
			src={DRIZZLE_AUDIO_SRC}
		/>
	);
}
