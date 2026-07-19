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
	/** Visible channel reserved for the weaker return stroke after sheet lightning. */
	bolt: number;
	/** Downward progress of the faint stepped leader immediately before a return stroke. */
	leaderProgress: number;
	leaderStrength: number;
	/** Stable geometry seed for one discharge; changes between audio loops. */
	strikeSeed: number;
}

const DRIZZLE_LIGHTNING_FLASHES = [
	{ timeSeconds: 12.08, strength: 1, boltStrength: 0, strikeSeed: 0.17 },
	{ timeSeconds: 12.34, strength: 0.48, boltStrength: 1, strikeSeed: 0.17 },
	{ timeSeconds: 22.38, strength: 0.86, boltStrength: 0, strikeSeed: 0.71 },
	{ timeSeconds: 22.62, strength: 0.38, boltStrength: 0.76, strikeSeed: 0.71 },
	{ timeSeconds: 26.08, strength: 1, boltStrength: 0, strikeSeed: 0.42 },
	{ timeSeconds: 26.34, strength: 0.52, boltStrength: 0.9, strikeSeed: 0.42 },
	{ timeSeconds: 31.8, strength: 0.45, boltStrength: 0, strikeSeed: 0.88 },
	{ timeSeconds: 44.98, strength: 0.94, boltStrength: 0, strikeSeed: 0.59 },
	{ timeSeconds: 45.25, strength: 0.42, boltStrength: 0.84, strikeSeed: 0.59 },
	{ timeSeconds: 52.7, strength: 0.52, boltStrength: 0.28, strikeSeed: 0.93 },
] as const;

const BOLT_LEADER_SECONDS = 0.22;
const BOLT_VISIBLE_SECONDS = 0.52;
const GOLDEN_RATIO_FRACTION = 0.61803398875;

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

const getFlashPulse = (elapsed: number): number => {
	const attackSeconds = 0.045;
	const decaySeconds = 0.16;
	if (elapsed < -attackSeconds || elapsed > 0.6) return 0;
	return elapsed < 0
		? smoothstep(1 + elapsed / attackSeconds)
		: Math.exp(-elapsed / decaySeconds) * (1 - smoothstep(elapsed / 0.6));
};

const getFlashEnvelope = (
	timeSeconds: number,
	getStrength: (flash: (typeof DRIZZLE_LIGHTNING_FLASHES)[number]) => number,
): number => {
	return DRIZZLE_LIGHTNING_FLASHES.reduce((strongest, flash) => {
		const elapsed = timeSeconds - flash.timeSeconds;
		return Math.max(strongest, getStrength(flash) * getFlashPulse(elapsed));
	}, 0);
};

const getLightningEnvelope = (timeSeconds: number): number =>
	getFlashEnvelope(timeSeconds, (flash) => flash.strength);

const getLightningStrikeSeed = (timeSeconds: number, loopIndex: number) => {
	let strongestFlash = 0;
	let strikeSeed = 0;
	for (const flash of DRIZZLE_LIGHTNING_FLASHES) {
		const strength =
			flash.strength * getFlashPulse(timeSeconds - flash.timeSeconds);
		if (strength <= strongestFlash) continue;
		strongestFlash = strength;
		strikeSeed = (flash.strikeSeed + loopIndex * GOLDEN_RATIO_FRACTION) % 1;
	}
	return strikeSeed;
};

const getBoltVisualState = (timeSeconds: number, loopIndex: number) => {
	let strongestActivity = 0;
	let bolt = 0;
	let leaderProgress = 0;
	let leaderStrength = 0;
	let strikeSeed = 0;

	for (const flash of DRIZZLE_LIGHTNING_FLASHES) {
		if (flash.boltStrength <= 0) continue;
		const elapsed = timeSeconds - flash.timeSeconds;
		if (elapsed < -BOLT_LEADER_SECONDS || elapsed > BOLT_VISIBLE_SECONDS) {
			continue;
		}

		const nextLeaderProgress =
			elapsed < 0
				? smoothstep((elapsed + BOLT_LEADER_SECONDS) / BOLT_LEADER_SECONDS)
				: 1;
		const nextLeaderStrength =
			elapsed < 0 ? flash.boltStrength * (0.35 + 0.65 * nextLeaderProgress) : 0;
		const returnAttackSeconds = 0.012;
		const nextBolt =
			elapsed < -returnAttackSeconds
				? 0
				: flash.boltStrength *
					(elapsed < 0
						? smoothstep(1 + elapsed / returnAttackSeconds)
						: Math.exp(-elapsed / 0.11) *
							(1 - smoothstep(elapsed / BOLT_VISIBLE_SECONDS)));
		const activity = Math.max(nextBolt, nextLeaderStrength * 0.18);
		if (activity <= strongestActivity) continue;

		strongestActivity = activity;
		bolt = nextBolt;
		leaderProgress = nextLeaderProgress;
		leaderStrength = nextLeaderStrength;
		strikeSeed = (flash.strikeSeed + loopIndex * GOLDEN_RATIO_FRACTION) % 1;
	}

	return { bolt, leaderProgress, leaderStrength, strikeSeed };
};

export const getDrizzleVisualState = (
	timeSeconds: number,
): DrizzleVisualState => {
	const elapsedTime = Math.max(0, timeSeconds);
	const loopIndex = Math.floor(elapsedTime / DRIZZLE_AUDIO_LOOP_SECONDS);
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
	const boltVisual = getBoltVisualState(normalizedTime, loopIndex);
	const hasVisibleDischarge =
		boltVisual.bolt > 0 || boltVisual.leaderStrength > 0;
	const strikeSeed = hasVisibleDischarge
		? boltVisual.strikeSeed
		: getLightningStrikeSeed(normalizedTime, loopIndex);

	return {
		intensity: Math.min(
			1,
			Math.max(0.32, breathing * entrance + thunder * 0.06),
		),
		windBoost: 1 + thunder * 0.22,
		thunder,
		lightning,
		...boltVisual,
		strikeSeed,
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
