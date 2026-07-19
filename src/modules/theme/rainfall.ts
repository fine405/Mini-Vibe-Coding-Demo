/**
 * Pure rainfall simulation for the Drizzle theme.
 *
 * The model is intentionally renderer-agnostic (no canvas imports) so the
 * physics can be unit-tested in jsdom. Coordinates are CSS pixels with the
 * origin at the top-left and +y pointing down.
 *
 * The look targets a real-world drizzle rather than a storm, referencing the
 * rainfall feel of https://www.shadertoy.com/view/ltffzl without its
 * glass-pane refraction:
 *
 * - Drops stay at terminal velocity (drizzle reaches it within centimeters
 *   of fall), scaled by depth layer: ~1.3–2.1 m/s for the near layer, which
 *   matches the measured 0.7–2 m/s range of sub-0.5mm drizzle drops.
 * - Wind is a slowly gusting global field; drizzle drops are light enough to
 *   follow gusts almost immediately, plus a small per-drop turbulence so
 *   streaks are not perfectly parallel.
 * - Impacts on the bottom edge obey splash physics at drizzle scale: a few
 *   secondary droplets ejected near-vertical at a fraction of the impact
 *   speed, then purely ballistic under gravity (apex only a few pixels), and
 *   a small crown ring that expands and fades in ~0.2s. Restrained by
 *   design — drizzle Weber numbers are low, so splashes stay tiny.
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
}

interface RainLayerConfig {
	/** Share of the total drop count. */
	share: number;
	/** Terminal velocity range in px/s. */
	speed: [min: number, max: number];
	/** Streak opacity range. */
	alpha: [min: number, max: number];
	/** Stroke width of a streak in px. */
	strokeWidth: number;
	/** How strongly the global wind pushes this layer. */
	windFactor: number;
}

export const RAIN_LAYER_CONFIG: Record<RainLayer, RainLayerConfig> = {
	far: {
		share: 0.45,
		speed: [170, 260],
		alpha: [0.1, 0.16],
		strokeWidth: 0.7,
		windFactor: 0.5,
	},
	mid: {
		share: 0.35,
		speed: [280, 420],
		alpha: [0.16, 0.26],
		strokeWidth: 0.9,
		windFactor: 0.75,
	},
	near: {
		share: 0.2,
		speed: [420, 620],
		alpha: [0.24, 0.38],
		strokeWidth: 1.2,
		windFactor: 1,
	},
};

/** Drop count scales with viewport area, capped for performance. */
export const MIN_DROP_COUNT = 240;
export const MAX_DROP_COUNT = 640;

export const getDropCount = (width: number, height: number): number =>
	Math.min(
		MAX_DROP_COUNT,
		Math.max(MIN_DROP_COUNT, Math.round((width * height) / 5500)),
	);

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
	10 + 16 * Math.sin(0.07 * time + 0.6) + 7 * Math.sin(0.023 * time);

export const RAIN_WIND_RANGE: readonly [min: number, max: number] = [-16, 34];

/** 9.81 m/s² at the ~300 px/m near-layer scale, in px/s². */
export const RAIN_GRAVITY = 2940;

/** Secondary droplets are ejected at this fraction of the impact speed. */
export const EJECT_SPEED_FRACTION: readonly [min: number, max: number] = [
	0.18, 0.38,
];

/** Half-angle of the ejection cone around the vertical, in radians. */
export const EJECT_SPREAD_RADIANS = 0.5;

/** Splash crowns live briefly; drizzle impacts are gentle. */
export const RING_LIFETIME_SECONDS = 0.22;

/** Hard bounds on live splash particles to keep the frame cheap. */
export const MAX_SPRAY_COUNT = 220;
export const MAX_RING_COUNT = 80;

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
): Raindrop => {
	const drop = {} as Raindrop;
	randomizeDrop(drop, layer, width, height, random, true);
	return drop;
};

export const createRainfall = (
	width: number,
	height: number,
	random: () => number = Math.random,
): RainfallState => {
	const counts = getLayerDropCounts(getDropCount(width, height));
	const drops: Raindrop[] = [];
	for (const layer of ["far", "mid", "near"] as const) {
		for (let i = 0; i < counts[layer]; i++) {
			drops.push(createDrop(layer, width, height, random));
		}
	}
	return { width, height, time: 0, drops, sprays: [], rings: [] };
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
	const dropletCount = drop.layer === "far" ? 1 : 2 + Math.round(random());

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
			alpha: Math.min(0.55, drop.alpha * 1.6),
			size: config.strokeWidth,
		});
	}

	state.rings.push({
		x: drop.x,
		groundY: state.height,
		age: 0,
		lifetime: RING_LIFETIME_SECONDS,
		maxRadius: getCrownRadius(drop.speed),
		alpha: Math.min(0.5, drop.alpha * 1.4),
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
): void => {
	if (dt <= 0) return;
	state.time += dt;
	const wind = getRainWindAt(state.time);

	for (const drop of state.drops) {
		const config = RAIN_LAYER_CONFIG[drop.layer];
		drop.age += dt;

		drop.vx =
			wind * config.windFactor * drop.windSusceptibility +
			drop.turbulenceAmplitude *
				Math.sin(state.time * drop.turbulenceFrequency + drop.turbulencePhase);
		drop.x += drop.vx * dt;
		drop.y += drop.speed * dt;

		// Impact on the bottom edge: splash, then recycle above the top.
		if (drop.y >= state.height) {
			spawnSplash(state, drop, random);
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
