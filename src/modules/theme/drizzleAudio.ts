export const DRIZZLE_AUDIO_SRC = "/themes/drizzle-rain.mp3";
export const DRIZZLE_AUDIO_VOLUME = 0.5;
/** Rounded from the encoded asset duration (60.029388s). */
export const DRIZZLE_AUDIO_LOOP_SECONDS = 60.03;
const DRIZZLE_INTRO_SECONDS = 4;
const TAU = Math.PI * 2;

export const DRIZZLE_THUNDER_RANGES = [
	{ startSeconds: 12, endSeconds: 17.4, truncatedByClip: false },
	{ startSeconds: 22.3, endSeconds: 25, truncatedByClip: false },
	{ startSeconds: 26, endSeconds: 38, truncatedByClip: false },
	{
		startSeconds: 44.9,
		endSeconds: DRIZZLE_AUDIO_LOOP_SECONDS,
		truncatedByClip: true,
	},
] as const;

export interface DrizzleVisualState {
	intensity: number;
	windBoost: number;
	thunder: number;
	/** Short lightning exposure pulse, separate from the long thunder rumble. */
	lightning: number;
}

const DRIZZLE_LIGHTNING_FLASHES = [
	{ timeSeconds: 12.08, strength: 1 },
	{ timeSeconds: 12.34, strength: 0.48 },
	{ timeSeconds: 22.38, strength: 0.86 },
	{ timeSeconds: 22.62, strength: 0.38 },
	{ timeSeconds: 26.08, strength: 1 },
	{ timeSeconds: 26.34, strength: 0.52 },
	{ timeSeconds: 31.8, strength: 0.45 },
	{ timeSeconds: 44.98, strength: 0.94 },
	{ timeSeconds: 45.25, strength: 0.42 },
	{ timeSeconds: 52.7, strength: 0.52 },
] as const;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smoothstep = (value: number): number => {
	const t = clamp01(value);
	return t * t * (3 - 2 * t);
};

const getThunderEnvelope = (
	timeSeconds: number,
	carryPreviousLoop: boolean,
): number => {
	const edgeSeconds = 1;
	const rangeEnvelope = DRIZZLE_THUNDER_RANGES.reduce((strongest, range) => {
		if (timeSeconds < range.startSeconds || timeSeconds > range.endSeconds) {
			return strongest;
		}
		const attack = smoothstep((timeSeconds - range.startSeconds) / edgeSeconds);
		const release = range.truncatedByClip
			? 1
			: smoothstep((range.endSeconds - timeSeconds) / edgeSeconds);
		return Math.max(strongest, Math.min(attack, release));
	}, 0);
	const wrapRelease = carryPreviousLoop
		? 1 - smoothstep(timeSeconds / edgeSeconds)
		: 0;
	return Math.max(rangeEnvelope, wrapRelease);
};

const getLightningEnvelope = (timeSeconds: number): number => {
	const attackSeconds = 0.045;
	const decaySeconds = 0.16;
	return DRIZZLE_LIGHTNING_FLASHES.reduce((strongest, flash) => {
		const elapsed = timeSeconds - flash.timeSeconds;
		if (elapsed < -attackSeconds || elapsed > 0.6) return strongest;
		const pulse =
			elapsed < 0
				? smoothstep(1 + elapsed / attackSeconds)
				: Math.exp(-elapsed / decaySeconds) * (1 - smoothstep(elapsed / 0.6));
		return Math.max(strongest, flash.strength * pulse);
	}, 0);
};

export const getDrizzleVisualState = (
	timeSeconds: number,
): DrizzleVisualState => {
	const elapsedTime = Math.max(0, timeSeconds);
	const normalizedTime =
		((elapsedTime % DRIZZLE_AUDIO_LOOP_SECONDS) + DRIZZLE_AUDIO_LOOP_SECONDS) %
		DRIZZLE_AUDIO_LOOP_SECONDS;
	const entrance = 0.4 + 0.6 * smoothstep(elapsedTime / DRIZZLE_INTRO_SECONDS);
	const breathing =
		0.88 +
		0.045 * Math.sin((TAU * normalizedTime) / 15) +
		0.03 * Math.sin((TAU * normalizedTime) / 30 + 1.1);
	const thunder = getThunderEnvelope(
		normalizedTime,
		elapsedTime >= DRIZZLE_AUDIO_LOOP_SECONDS,
	);
	const lightning = getLightningEnvelope(normalizedTime);

	return {
		intensity: Math.min(
			1,
			Math.max(0.32, breathing * entrance + thunder * 0.06),
		),
		windBoost: 1 + thunder * 0.22,
		thunder,
		lightning,
	};
};

export interface DrizzleLoopClock {
	getTime: (audioTime: number) => number;
}

/** Converts the audio element's resetting currentTime into monotonic time. */
export const createDrizzleLoopClock = (): DrizzleLoopClock => {
	let lastAudioTime: number | null = null;
	let loopOffset = 0;

	return {
		getTime: (audioTime: number) => {
			const safeAudioTime = Math.max(0, audioTime);
			if (lastAudioTime !== null && safeAudioTime < lastAudioTime - 1) {
				loopOffset += DRIZZLE_AUDIO_LOOP_SECONDS;
			}
			lastAudioTime = safeAudioTime;
			return loopOffset + safeAudioTime;
		},
	};
};

let activeDrizzleAudio: HTMLAudioElement | null = null;

export const registerDrizzleAudio = (audio: HTMLAudioElement): (() => void) => {
	activeDrizzleAudio = audio;
	return () => {
		if (activeDrizzleAudio === audio) activeDrizzleAudio = null;
	};
};

export const getDrizzleAudioTime = (): number | null => {
	if (!activeDrizzleAudio || activeDrizzleAudio.paused) return null;
	return Number.isFinite(activeDrizzleAudio.currentTime)
		? activeDrizzleAudio.currentTime
		: null;
};
