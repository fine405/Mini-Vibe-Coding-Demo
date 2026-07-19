/**
 * Pure rainfall simulation for the Drizzle theme.
 *
 * The model is intentionally renderer-agnostic (no canvas imports) so the
 * physics can be unit-tested in jsdom. Coordinates are CSS pixels with the
 * origin at the top-left and +y pointing down.
 *
 * The look targets steady light rain rather than a storm, referencing the
 * rainfall feel of https://www.shadertoy.com/view/ltffzl without its
 * glass-pane refraction:
 *
 * - Drops stay at terminal velocity, scaled by depth layer: ~1.9–2.7 m/s for
 *   the near layer so the picture carries the weight of the rain recording.
 * - Wind is a slowly gusting global field; drizzle drops are light enough to
 *   follow gusts almost immediately, plus a small per-drop turbulence so
 *   streaks are not perfectly parallel.
 * - Only a small fraction of near-camera impacts splash at the bottom edge.
 *   Their secondary droplets stay ballistic and tiny; far and mid layers
 *   recycle silently so the viewport edge does not read as a hard surface.
 */

export type RainLayer = "far" | "mid" | "near";

export interface Raindrop {
	layer: RainLayer;
	x: number;
	y: number;
	/** Terminal fall speed in px/s (constant once spawned). */
	speed: number;
	/** Current horizontal velocity in px/s, refreshed every step. */
	vx: number;
	/** Per-drop susceptibility to the global wind, ~0.75–1.1. */
	windSusceptibility: number;
	/** Small velocity-space turbulence so streaks are not parallel. */
	turbulenceAmplitude: number;
	turbulenceFrequency: number;
	turbulencePhase: number;
	/** Base streak opacity for this drop. */
	alpha: number;
	/** Visible motion-blur length in CSS pixels. */
	streakLength: number;
	/** Seconds since spawn, drives the fade-in. */
	age: number;
}

/** Secondary droplet thrown up by an impact; purely ballistic. */
export interface SprayDroplet {
	x: number;
	y: number;
	vx: number;
	vy: number;
	age: number;
	/** Seconds until the droplet falls back to the ground line. */
	lifetime: number;
	alpha: number;
	size: number;
}

/** Expanding crown ring left by an impact on the ground line. */
export interface SplashRing {
	x: number;
	groundY: number;
	age: number;
	lifetime: number;
	maxRadius: number;
	alpha: number;
}

export interface RainfallState {
	width: number;
	height: number;
	time: number;
	drops: Raindrop[];
	sprays: SprayDroplet[];
	rings: SplashRing[];
	spawnAccumulator: number;
}

export interface RainfallControls {
	/** Normalized active population requested by the audio timeline. */
	intensity: number;
	/** Restrained multiplier used during thunder ranges. */
	windBoost: number;
}

interface RainLayerConfig {
	/** Share of the total drop count. */
	share: number;
	/** Terminal velocity range in px/s. */
	speed: [min: number, max: number];
	/** Streak opacity range. */
	alpha: [min: number, max: number];
	/** Visible motion-blur length range in px. */
	streakLength: [min: number, max: number];
	/** Stroke width of a streak in px. */
	strokeWidth: number;
	/** How strongly the global wind pushes this layer. */
	windFactor: number;
}

export const RAIN_LAYER_CONFIG: Record<RainLayer, RainLayerConfig> = {
	far: {
		share: 0.56,
		speed: [220, 340],
		alpha: [0.1, 0.17],
		streakLength: [7, 12],
		strokeWidth: 0.68,
		windFactor: 0.5,
	},
	mid: {
		share: 0.36,
		speed: [380, 560],
		alpha: [0.17, 0.27],
		streakLength: [11, 18],
		strokeWidth: 0.92,
		windFactor: 0.75,
	},
	near: {
		share: 0.08,
		speed: [580, 820],
		alpha: [0.22, 0.34],
		streakLength: [15, 22],
		strokeWidth: 1.15,
		windFactor: 1,
	},
};

/** Maximum population scales with viewport area; intensity selects a subset. */
export const MIN_DROP_COUNT = 88;
export const MAX_DROP_COUNT = 360;
const MIN_ACTIVE_DROP_COUNT = 24;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const getDropCount = (
	width: number,
	height: number,
	intensity = 1,
): number => {
	const maximum = Math.min(
		MAX_DROP_COUNT,
		Math.max(MIN_DROP_COUNT, Math.round((width * height) / 5200)),
	);
	return Math.min(
		maximum,
		Math.max(
			Math.min(MIN_ACTIVE_DROP_COUNT, maximum),
			Math.round(maximum * clamp01(intensity)),
		),
	);
};

export const getLayerDropCounts = (
	total: number,
): Record<RainLayer, number> => {
	const far = Math.round(total * RAIN_LAYER_CONFIG.far.share);
	const near = Math.round(total * RAIN_LAYER_CONFIG.near.share);
	return { far, mid: total - far - near, near };
};

/**
 * Slowly gusting global wind in px/s. Two long-period sines keep the drift
 * meandering; drizzle air is near calm, so the range is modest.
 */
export const getRainWindAt = (time: number): number =>
	24 + 18 * Math.sin(0.07 * time + 0.6) + 8 * Math.sin(0.023 * time);

export const RAIN_WIND_RANGE: readonly [min: number, max: number] = [-2, 50];

/** 9.81 m/s² at the ~300 px/m near-layer scale, in px/s². */
export const RAIN_GRAVITY = 2940;

/** Secondary droplets are ejected at this fraction of the impact speed. */
export const EJECT_SPEED_FRACTION: readonly [min: number, max: number] = [
	0.18, 0.38,
];

/** Half-angle of the ejection cone around the vertical, in radians. */
export const EJECT_SPREAD_RADIANS = 0.5;

/** Splash crowns live briefly; light-rain impacts remain small. */
export const RING_LIFETIME_SECONDS = 0.28;

/** Hard bounds on live splash particles to keep the frame cheap. */
export const MAX_SPRAY_COUNT = 90;
export const MAX_RING_COUNT = 36;

/** Some near-camera impacts make a visible splash at the bottom edge. */
export const NEAR_SPLASH_CHANCE = 0.3;

const rand = (
	random: () => number,
	[min, max]: readonly [number, number],
): number => min + random() * (max - min);

const randomizeDrop = (
	drop: Raindrop,
	layer: RainLayer,
	width: number,
	height: number,
	random: () => number,
	scatterVertically: boolean,
): void => {
	const config = RAIN_LAYER_CONFIG[layer];
	drop.layer = layer;
	drop.speed = rand(random, config.speed);
	drop.alpha = rand(random, config.alpha);
	drop.streakLength = rand(random, config.streakLength);
	drop.windSusceptibility = rand(random, [0.75, 1.1]);
	drop.turbulenceAmplitude = rand(random, [3, 10]);
	drop.turbulenceFrequency = rand(random, [0.4, 1]);
	drop.turbulencePhase = random() * Math.PI * 2;
	drop.x = random() * width;
	// On first spawn drops fill the whole viewport; on respawn they re-enter
	// just above the top edge so the fall looks continuous.
	drop.y = scatterVertically ? random() * height : -random() * 24 - 4;
	drop.vx = 0;
	drop.age = 0;
};

const createDrop = (
	layer: RainLayer,
	width: number,
	height: number,
	random: () => number,
	scatterVertically = true,
): Raindrop => {
	const drop = {} as Raindrop;
	randomizeDrop(drop, layer, width, height, random, scatterVertically);
	return drop;
};

export const createRainfall = (
	width: number,
	height: number,
	random: () => number = Math.random,
	intensity = 1,
): RainfallState => {
	const counts = getLayerDropCounts(getDropCount(width, height, intensity));
	const drops: Raindrop[] = [];
	for (const layer of ["far", "mid", "near"] as const) {
		for (let i = 0; i < counts[layer]; i++) {
			drops.push(createDrop(layer, width, height, random));
		}
	}
	return {
		width,
		height,
		time: 0,
		drops,
		sprays: [],
		rings: [],
		spawnAccumulator: 0,
	};
};

/**
 * Crown radius in px from the impact speed. Slower (farther/smaller) drops
 * leave smaller crowns, matching how splash size scales with drop energy.
 */
export const getCrownRadius = (impactSpeed: number): number =>
	1.4 + (impactSpeed / 640) * 3.6;

const spawnSplash = (
	state: RainfallState,
	drop: Raindrop,
	random: () => number,
): void => {
	const config = RAIN_LAYER_CONFIG[drop.layer];
	const dropletCount = 2 + Math.round(random());

	for (let i = 0; i < dropletCount; i++) {
		const angle = (random() * 2 - 1) * EJECT_SPREAD_RADIANS;
		const speed = drop.speed * rand(random, EJECT_SPEED_FRACTION);
		const vy = -speed * Math.cos(angle);
		// Ballistic time of flight back to the ground line, capped.
		const lifetime = Math.min(0.5, (-2 * vy) / RAIN_GRAVITY);
		state.sprays.push({
			x: drop.x,
			y: state.height - 1,
			vx: speed * Math.sin(angle),
			vy,
			age: 0,
			lifetime,
			alpha: Math.min(0.42, drop.alpha * 1.45),
			size: config.strokeWidth,
		});
	}

	state.rings.push({
		x: drop.x,
		groundY: state.height,
		age: 0,
		lifetime: RING_LIFETIME_SECONDS,
		maxRadius: getCrownRadius(drop.speed),
		alpha: Math.min(0.36, drop.alpha * 1.3),
	});

	// Shed the oldest particles when the caps are exceeded.
	if (state.sprays.length > MAX_SPRAY_COUNT) {
		state.sprays.splice(0, state.sprays.length - MAX_SPRAY_COUNT);
	}
	if (state.rings.length > MAX_RING_COUNT) {
		state.rings.splice(0, state.rings.length - MAX_RING_COUNT);
	}
};

const WRAP_MARGIN = 24;

export const stepRainfall = (
	state: RainfallState,
	dt: number,
	random: () => number = Math.random,
	controls: RainfallControls = { intensity: 1, windBoost: 1 },
): void => {
	if (dt <= 0) return;
	state.time += dt;
	const targetCount = getDropCount(
		state.width,
		state.height,
		controls.intensity,
	);
	const targetLayerCounts = getLayerDropCounts(targetCount);
	const currentLayerCounts = state.drops.reduce<Record<RainLayer, number>>(
		(counts, drop) => {
			counts[drop.layer] += 1;
			return counts;
		},
		{ far: 0, mid: 0, near: 0 },
	);

	const spawnRate = getDropCount(state.width, state.height) * 0.32;
	state.spawnAccumulator += spawnRate * dt;
	while (state.drops.length < targetCount && state.spawnAccumulator >= 1) {
		let nextLayer: RainLayer = "far";
		let largestDeficit = Number.NEGATIVE_INFINITY;
		for (const layer of ["far", "mid", "near"] as const) {
			const deficit = targetLayerCounts[layer] - currentLayerCounts[layer];
			if (deficit > largestDeficit) {
				largestDeficit = deficit;
				nextLayer = layer;
			}
		}
		state.drops.push(
			createDrop(nextLayer, state.width, state.height, random, false),
		);
		currentLayerCounts[nextLayer] += 1;
		state.spawnAccumulator -= 1;
	}
	if (state.drops.length >= targetCount) {
		state.spawnAccumulator = Math.min(state.spawnAccumulator, 1);
	}

	const wind =
		getRainWindAt(state.time) *
		Math.min(1.2, Math.max(0.8, controls.windBoost));

	for (let index = state.drops.length - 1; index >= 0; index--) {
		const drop = state.drops[index];
		const config = RAIN_LAYER_CONFIG[drop.layer];
		drop.age += dt;

		drop.vx =
			wind * config.windFactor * drop.windSusceptibility +
			drop.turbulenceAmplitude *
				Math.sin(state.time * drop.turbulenceFrequency + drop.turbulencePhase);
		drop.x += drop.vx * dt;
		drop.y += drop.speed * dt;

		// Near drops occasionally splash; surplus drops retire at the bottom.
		if (drop.y >= state.height) {
			if (drop.layer === "near" && random() < NEAR_SPLASH_CHANCE) {
				spawnSplash(state, drop, random);
			}
			if (state.drops.length > targetCount) {
				state.drops.splice(index, 1);
				continue;
			}
			randomizeDrop(drop, drop.layer, state.width, state.height, random, false);
			continue;
		}

		// Wind can push drops past a side edge: wrap them to the other side.
		if (drop.x < -WRAP_MARGIN) {
			drop.x += state.width + WRAP_MARGIN * 2;
		} else if (drop.x > state.width + WRAP_MARGIN) {
			drop.x -= state.width + WRAP_MARGIN * 2;
		}
	}

	for (let i = state.sprays.length - 1; i >= 0; i--) {
		const spray = state.sprays[i];
		spray.age += dt;
		spray.vy += RAIN_GRAVITY * dt;
		spray.x += spray.vx * dt;
		spray.y += spray.vy * dt;
		// Dead once back at the ground line or out of its ballistic lifetime.
		if (spray.age >= spray.lifetime || spray.y >= state.height) {
			state.sprays.splice(i, 1);
		}
	}

	for (let i = state.rings.length - 1; i >= 0; i--) {
		const ring = state.rings[i];
		ring.age += dt;
		if (ring.age >= ring.lifetime) {
			state.rings.splice(i, 1);
		}
	}
};

/** Fade-in factor for freshly spawned drops, ~0.4s ramp. */
export const getDropFade = (drop: Raindrop): number =>
	Math.min(1, drop.age / 0.4);
