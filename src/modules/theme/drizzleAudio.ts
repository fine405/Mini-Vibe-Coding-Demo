export const DRIZZLE_AUDIO_SRC = "/themes/drizzle-rain.mp3";
export const DRIZZLE_AUDIO_VOLUME = 0.5;

export const DRIZZLE_THUNDER_RANGES = [
	{ startSeconds: 12, endSeconds: 17.4, truncatedByClip: false },
	{ startSeconds: 22.3, endSeconds: 25, truncatedByClip: false },
	{ startSeconds: 26, endSeconds: 38, truncatedByClip: false },
	{ startSeconds: 44.9, endSeconds: 60, truncatedByClip: true },
] as const;
