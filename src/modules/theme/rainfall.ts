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

import {
	findRainSurfaceHit,
	type RainSurfaceGeometry,
	type RainSurfaceHit,
} from "@/modules/theme/rainSurfaces";

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

/** Expanding crown ring left by an impact on a solid surface. */
export interface SplashRing {
	x: number;
	y: number;
	/** Rotation of the impacted surface tangent, in radians. */
	tangentAngle: number;
	age: number;
	lifetime: number;
	maxRadius: number;
	alpha: number;
}

export interface WetRainSurface extends RainSurfaceGeometry {
	leftReservoir: number;
	rightReservoir: number;
}

/** A small packet of water moving along a component's top edge. */
export interface SurfaceWaterBead {
	surfaceId: string;
	/** Normalized position along the straight portion of the top edge. */
	u: number;
	velocity: number;
	volume: number;
}

/** Water released from a rounded component edge back into the rain field. */
export interface RunoffDroplet {
	x: number;
	y: number;
	vx: number;
	vy: number;
	age: number;
	volume: number;
	alpha: number;
	size: number;
	sourceSurfaceId: string;
}

export interface RainfallState {
	width: number;
	height: number;
	time: number;
	drops: Raindrop[];
	sprays: SprayDroplet[];
	rings: SplashRing[];
	surfaces: WetRainSurface[];
	surfaceBeads: SurfaceWaterBead[];
	runoffDrops: RunoffDroplet[];
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
export const MAX_SURFACE_BEAD_COUNT = 72;
export const MAX_RUNOFF_DROP_COUNT = 36;

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
		surfaces: [],
		surfaceBeads: [],
		runoffDrops: [],
		spawnAccumulator: 0,
	};
};

/**
 * Crown radius in px from the impact speed. Slower (farther/smaller) drops
 * leave smaller crowns, matching how splash size scales with drop energy.
 */
export const getCrownRadius = (impactSpeed: number): number =>
	1.4 + (impactSpeed / 640) * 3.6;

const spawnImpact = (
	state: RainfallState,
	point: { x: number; y: number; normalX: number; normalY: number },
	impactSpeed: number,
	alpha: number,
	size: number,
	random: () => number,
): void => {
	const dropletCount = 2 + Math.round(random());
	const tangentX = -point.normalY;
	const tangentY = point.normalX;

	for (let i = 0; i < dropletCount; i++) {
		const angle = (random() * 2 - 1) * EJECT_SPREAD_RADIANS;
		const speed = impactSpeed * rand(random, EJECT_SPEED_FRACTION);
		const normalSpeed = speed * Math.cos(angle);
		const tangentSpeed = speed * Math.sin(angle);
		const vx = point.normalX * normalSpeed + tangentX * tangentSpeed;
		const vy = point.normalY * normalSpeed + tangentY * tangentSpeed;
		const lifetime = Math.min(
			0.5,
			Math.max(0.16, vy < 0 ? (-2 * vy) / RAIN_GRAVITY : 0.16),
		);
		state.sprays.push({
			x: point.x + point.normalX,
			y: point.y + point.normalY,
			vx,
			vy,
			age: 0,
			lifetime,
			alpha: Math.min(0.42, alpha * 1.45),
			size,
		});
	}

	state.rings.push({
		x: point.x,
		y: point.y,
		tangentAngle: Math.atan2(tangentY, tangentX),
		age: 0,
		lifetime: RING_LIFETIME_SECONDS,
		maxRadius: getCrownRadius(impactSpeed),
		alpha: Math.min(0.36, alpha * 1.3),
	});

	if (state.sprays.length > MAX_SPRAY_COUNT) {
		state.sprays.splice(0, state.sprays.length - MAX_SPRAY_COUNT);
	}
	if (state.rings.length > MAX_RING_COUNT) {
		state.rings.splice(0, state.rings.length - MAX_RING_COUNT);
	}
};

const getTopTrack = (surface: RainSurfaceGeometry) => {
	const radius = Math.min(surface.radius, surface.width * 0.5);
	const left = surface.x + radius;
	const right = surface.x + surface.width - radius;
	return { left, width: Math.max(1, right - left) };
};

export const setRainSurfaces = (
	state: RainfallState,
	surfaces: readonly RainSurfaceGeometry[],
): void => {
	const previous = new Map(
		state.surfaces.map((surface) => [surface.id, surface] as const),
	);
	state.surfaces = surfaces.map((surface) => ({
		...surface,
		leftReservoir: previous.get(surface.id)?.leftReservoir ?? 0,
		rightReservoir: previous.get(surface.id)?.rightReservoir ?? 0,
	}));
	const activeIds = new Set(state.surfaces.map((surface) => surface.id));
	state.surfaceBeads = state.surfaceBeads.filter((bead) =>
		activeIds.has(bead.surfaceId),
	);
};

const getSurfaceById = (
	state: RainfallState,
	id: string,
): WetRainSurface | undefined =>
	state.surfaces.find((surface) => surface.id === id);

export const depositSurfaceWater = (
	state: RainfallState,
	hit: RainSurfaceHit,
	volume: number,
): void => {
	if (volume <= 0 || hit.normalY > -0.2) return;
	const surface = getSurfaceById(state, hit.surfaceId);
	if (!surface) return;
	const track = getTopTrack(surface);
	const u = clamp01((hit.x - track.left) / track.width);
	const mergeDistance = 12 / track.width;
	const existing = state.surfaceBeads.find(
		(bead) =>
			bead.surfaceId === surface.id && Math.abs(bead.u - u) <= mergeDistance,
	);
	if (existing) {
		const nextVolume = existing.volume + volume;
		existing.u = (existing.u * existing.volume + u * volume) / nextVolume;
		existing.volume = nextVolume;
		return;
	}

	if (state.surfaceBeads.length >= MAX_SURFACE_BEAD_COUNT) {
		const nearest = state.surfaceBeads.reduce<SurfaceWaterBead | undefined>(
			(best, bead) => {
				if (bead.surfaceId !== surface.id) return best;
				if (!best || Math.abs(bead.u - u) < Math.abs(best.u - u)) return bead;
				return best;
			},
			undefined,
		);
		if (nearest) nearest.volume += volume;
		return;
	}

	state.surfaceBeads.push({ surfaceId: surface.id, u, velocity: 0, volume });
};

const emitRunoff = (
	state: RainfallState,
	surface: WetRainSurface,
	side: "left" | "right",
	volume: number,
	random: () => number,
): void => {
	if (state.runoffDrops.length >= MAX_RUNOFF_DROP_COUNT) return;
	const direction = side === "left" ? -1 : 1;
	state.runoffDrops.push({
		x: side === "left" ? surface.x - 0.75 : surface.x + surface.width + 0.75,
		y: surface.y + Math.max(2, surface.radius * 0.72),
		vx: direction * (8 + random() * 10),
		vy: 25 + random() * 20,
		age: 0,
		volume,
		alpha: 0.46,
		size: 1.15 + Math.sqrt(volume) * 0.38,
		sourceSurfaceId: surface.id,
	});
};

export const stepSurfaceWater = (
	state: RainfallState,
	dt: number,
	random: () => number = Math.random,
): void => {
	if (dt <= 0) return;
	for (let index = state.surfaceBeads.length - 1; index >= 0; index--) {
		const bead = state.surfaceBeads[index];
		const surface = getSurfaceById(state, bead.surfaceId);
		if (!surface) {
			state.surfaceBeads.splice(index, 1);
			continue;
		}
		const track = getTopTrack(surface);
		const side = bead.u < 0.5 ? -1 : bead.u > 0.5 ? 1 : random() < 0.5 ? -1 : 1;
		const distanceFromCenter = Math.abs(bead.u - 0.5) * 2;
		bead.velocity += side * (42 + distanceFromCenter * 96) * dt;
		bead.velocity *= Math.exp(-3.4 * dt);
		bead.u += (bead.velocity / track.width) * dt;

		if (bead.u <= 0) {
			surface.leftReservoir += bead.volume;
			state.surfaceBeads.splice(index, 1);
		} else if (bead.u >= 1) {
			surface.rightReservoir += bead.volume;
			state.surfaceBeads.splice(index, 1);
		}
	}

	for (const surface of state.surfaces) {
		const releaseVolume = Math.min(2.2, 0.75 + surface.width / 500);
		while (
			surface.leftReservoir >= releaseVolume &&
			state.runoffDrops.length < MAX_RUNOFF_DROP_COUNT
		) {
			surface.leftReservoir -= releaseVolume;
			emitRunoff(state, surface, "left", releaseVolume, random);
		}
		while (
			surface.rightReservoir >= releaseVolume &&
			state.runoffDrops.length < MAX_RUNOFF_DROP_COUNT
		) {
			surface.rightReservoir -= releaseVolume;
			emitRunoff(state, surface, "right", releaseVolume, random);
		}
	}
};

const DROP_WATER_VOLUME: Record<RainLayer, number> = {
	far: 0.08,
	mid: 0.2,
	near: 0.48,
};

const WRAP_MARGIN = 24;

const stepRunoffDrops = (
	state: RainfallState,
	dt: number,
	random: () => number,
): void => {
	for (let index = state.runoffDrops.length - 1; index >= 0; index--) {
		const drop = state.runoffDrops[index];
		const start = { x: drop.x, y: drop.y };
		drop.age += dt;
		drop.vy += 1800 * dt;
		drop.x += drop.vx * dt;
		drop.y += drop.vy * dt;
		const candidateSurfaces =
			drop.age < 0.12
				? state.surfaces.filter(
						(surface) => surface.id !== drop.sourceSurfaceId,
					)
				: state.surfaces;
		const hit = findRainSurfaceHit(start, drop, candidateSurfaces);
		if (hit) {
			depositSurfaceWater(state, hit, drop.volume * 0.8);
			spawnImpact(
				state,
				hit,
				Math.hypot(drop.vx, drop.vy),
				drop.alpha,
				drop.size,
				random,
			);
			state.runoffDrops.splice(index, 1);
			continue;
		}
		if (drop.y >= state.height) {
			spawnImpact(
				state,
				{ x: drop.x, y: state.height, normalX: 0, normalY: -1 },
				Math.hypot(drop.vx, drop.vy),
				drop.alpha,
				drop.size,
				random,
			);
			state.runoffDrops.splice(index, 1);
			continue;
		}
		if (
			drop.age > 4 ||
			drop.x < -WRAP_MARGIN ||
			drop.x > state.width + WRAP_MARGIN
		) {
			state.runoffDrops.splice(index, 1);
		}
	}
};

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
		const previousX = drop.x;
		const previousY = drop.y;

		drop.vx =
			wind * config.windFactor * drop.windSusceptibility +
			drop.turbulenceAmplitude *
				Math.sin(state.time * drop.turbulenceFrequency + drop.turbulencePhase);
		drop.x += drop.vx * dt;
		drop.y += drop.speed * dt;

		const surfaceHit = findRainSurfaceHit(
			{ x: previousX, y: previousY },
			drop,
			state.surfaces,
		);
		if (surfaceHit) {
			depositSurfaceWater(state, surfaceHit, DROP_WATER_VOLUME[drop.layer]);
			if (drop.layer === "near" || (drop.layer === "mid" && random() < 0.4)) {
				spawnImpact(
					state,
					surfaceHit,
					drop.speed,
					drop.alpha,
					config.strokeWidth,
					random,
				);
			}
			if (state.drops.length > targetCount) {
				state.drops.splice(index, 1);
				continue;
			}
			randomizeDrop(drop, drop.layer, state.width, state.height, random, false);
			continue;
		}

		// Near drops occasionally splash; surplus drops retire at the bottom.
		if (drop.y >= state.height) {
			if (drop.layer === "near" && random() < NEAR_SPLASH_CHANCE) {
				spawnImpact(
					state,
					{ x: drop.x, y: state.height, normalX: 0, normalY: -1 },
					drop.speed,
					drop.alpha,
					config.strokeWidth,
					random,
				);
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

	stepSurfaceWater(state, dt, random);
	stepRunoffDrops(state, dt, random);

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
