import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/modules/theme/store";

const SUMMER_VIDEO_SRC = "/themes/summer-leaves.mp4";
const SUMMER_AUDIO_SRC = "/themes/summer-forest.mp3";

const playMedia = (media: HTMLMediaElement, onRejected: () => void) => {
	try {
		const playback = media.play();
		if (playback) void playback.catch(onRejected);
	} catch {
		onRejected();
	}
};

export function SummerThemeMedia() {
	const mode = useThemeStore((state) => state.mode);
	const videoRef = useRef<HTMLVideoElement>(null);
	const audioRef = useRef<HTMLAudioElement>(null);
	const isSummerRef = useRef(false);
	const audioBlockedRef = useRef(false);
	const isSummer = mode === "summer";

	useEffect(() => {
		const video = videoRef.current;
		const audio = audioRef.current;
		if (!video || !audio) return;

		isSummerRef.current = isSummer;
		audioBlockedRef.current = false;
		if (!isSummer) return;

		playMedia(video, () => undefined);
		playMedia(audio, () => {
			if (isSummerRef.current) audioBlockedRef.current = true;
		});

		return () => {
			isSummerRef.current = false;
			audioBlockedRef.current = false;
			video.pause();
			audio.pause();
			video.currentTime = 0;
			audio.currentTime = 0;
		};
	}, [isSummer]);

	useEffect(() => {
		const retryBlockedAudio = () => {
			const audio = audioRef.current;
			if (!audio || !isSummerRef.current || !audioBlockedRef.current) return;

			audioBlockedRef.current = false;
			playMedia(audio, () => {
				if (isSummerRef.current) audioBlockedRef.current = true;
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
		<>
			<video
				aria-hidden="true"
				className={cn(
					"pointer-events-none fixed inset-0 z-40 h-full w-full object-cover object-top mix-blend-multiply opacity-0 transition-opacity duration-700 ease-out motion-reduce:transition-none",
					isSummer && "opacity-100",
				)}
				loop
				muted
				playsInline
				preload="none"
				ref={videoRef}
				src={SUMMER_VIDEO_SRC}
			/>
			<audio
				aria-hidden="true"
				hidden
				loop
				preload="none"
				ref={audioRef}
				src={SUMMER_AUDIO_SRC}
			/>
		</>
	);
}
