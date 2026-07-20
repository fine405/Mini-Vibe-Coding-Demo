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
	/** Normalized travel from the top tangent to the bottom tangent. */
	leftFlowProgress: number;
	rightFlowProgress: number;
}

/** A small packet of water moving along a component's top edge. */
export interface SurfaceWaterBead {
	surfaceId: string;
	/** Normalized position along the straight portion of the top edge. */
	u: number;
	velocity: number;
	volume: number;
	age: number;
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
	sourceSide: "left" | "right";
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
export const MIN_VISIBLE_SURFACE_WATER_VOLUME = 0.2;
export const SURFACE_RUNOFF_HANG_SECONDS = 0.28;

/** Some near-camera impacts make a visible splash at the bottom edge. */
export const NEAR_SPLASH_CHANCE = 0.3;

/**
 * Mid-layer drops only occasionally read as splashes on components; at full
 * rate a wide input box sparkles like static noise instead of rain.
 */
export const MID_SURFACE_SPLASH_CHANCE = 0.15;

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
	dropletScale = 1,
): void => {
	const dropletCount = Math.max(
		1,
		Math.round((2 + Math.round(random())) * dropletScale),
	);
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
		leftFlowProgress: previous.get(surface.id)?.leftFlowProgress ?? 0,
		rightFlowProgress: previous.get(surface.id)?.rightFlowProgress ?? 0,
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
	initialVelocity = 0,
): void => {
	if (volume <= 0 || hit.normalY > -0.2) return;
	const surface = getSurfaceById(state, hit.surfaceId);
	if (!surface) return;
	// An impact on the upper rounded corner has already crossed the top
	// tangent. Keep it attached to that side instead of letting wind push it
	// back onto the horizontal edge.
	if (hit.normalX < -0.05) {
		surface.leftReservoir += volume;
		return;
	}
	if (hit.normalX > 0.05) {
		surface.rightReservoir += volume;
		return;
	}
	const track = getTopTrack(surface);
	const u = clamp01((hit.x - track.left) / track.width);
	// Merge only genuinely adjacent deposits. A broad merge radius makes a
	// resting patch teleport toward unrelated impacts elsewhere on the edge.
	const mergeDistance = 24 / track.width;
	const existing = state.surfaceBeads.reduce<SurfaceWaterBead | undefined>(
		(best, bead) => {
			if (bead.surfaceId !== surface.id) return best;
			if (Math.abs(bead.u - u) > mergeDistance) return best;
			if (!best || Math.abs(bead.u - u) < Math.abs(best.u - u)) return bead;
			return best;
		},
		undefined,
	);
	if (existing) {
		const nextVolume = existing.volume + volume;
		existing.u = (existing.u * existing.volume + u * volume) / nextVolume;
		existing.velocity =
			(existing.velocity * existing.volume + initialVelocity * volume) /
			nextVolume;
		existing.volume = nextVolume;
		existing.age = 0;
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
		if (nearest) {
			nearest.volume += volume;
			nearest.age = 0;
		}
		return;
	}

	state.surfaceBeads.push({
		age: 0,
		surfaceId: surface.id,
		u,
		velocity: Math.min(16, Math.max(-16, initialVelocity)),
		volume,
	});
};

const getSurfaceRunoffRadius = (surface: RainSurfaceGeometry): number =>
	Math.max(
		0,
		Math.min(surface.radius, surface.width * 0.5, surface.height * 0.5),
	);

export const getSurfaceRunoffThreshold = (
	surface: RainSurfaceGeometry,
): number => Math.min(0.82, 0.38 + getSurfaceRunoffRadius(surface) / 80);

export const getSurfaceRunoffPathLength = (
	surface: RainSurfaceGeometry,
): number => {
	const radius = getSurfaceRunoffRadius(surface);
	return Math.PI * radius + Math.max(0, surface.height - radius * 2);
};

/** Point along a rounded edge from its top tangent to its bottom tangent. */
export const getSurfaceRunoffPoint = (
	surface: RainSurfaceGeometry,
	side: "left" | "right",
	progress: number,
): { x: number; y: number } => {
	const radius = getSurfaceRunoffRadius(surface);
	const arcLength = radius * Math.PI * 0.5;
	const verticalLength = Math.max(0, surface.height - radius * 2);
	const pathLength = arcLength * 2 + verticalLength;
	let distance = clamp01(progress) * pathLength;

	if (radius > 0 && distance <= arcLength) {
		const arcProgress = distance / arcLength;
		const angle =
			side === "left"
				? -Math.PI * 0.5 - arcProgress * Math.PI * 0.5
				: -Math.PI * 0.5 + arcProgress * Math.PI * 0.5;
		const centerX =
			side === "left" ? surface.x + radius : surface.x + surface.width - radius;
		return {
			x: centerX + Math.cos(angle) * radius,
			y: surface.y + radius + Math.sin(angle) * radius,
		};
	}

	distance -= arcLength;
	if (distance <= verticalLength) {
		return {
			x: side === "left" ? surface.x : surface.x + surface.width,
			y: surface.y + radius + distance,
		};
	}

	distance -= verticalLength;
	const arcProgress = arcLength > 0 ? Math.min(1, distance / arcLength) : 1;
	const angle =
		side === "left"
			? Math.PI - arcProgress * Math.PI * 0.5
			: arcProgress * Math.PI * 0.5;
	const centerX =
		side === "left" ? surface.x + radius : surface.x + surface.width - radius;
	return {
		x: centerX + Math.cos(angle) * radius,
		y: surface.y + surface.height - radius + Math.sin(angle) * radius,
	};
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
	const releasePoint = getSurfaceRunoffPoint(surface, side, 1);
	state.runoffDrops.push({
		x: releasePoint.x,
		y: releasePoint.y + 0.6,
		vx: direction * (1 + random() * 2),
		vy: 8 + random() * 8,
		age: -SURFACE_RUNOFF_HANG_SECONDS,
		volume,
		alpha: 0.34,
		size: 0.9 + Math.sqrt(volume) * 0.26,
		sourceSurfaceId: surface.id,
		sourceSide: side,
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
		bead.age += dt;
		// A level top edge has no sustained tangential force. The landing impulse
		// can slide a patch briefly, then contact-line pinning brings it to rest.
		bead.velocity *= Math.exp(-12 * dt);
		bead.u += (bead.velocity / track.width) * dt;
		// Unfed specks dry out instead of lingering as static dots.
		if (bead.age > 4 && bead.volume < 0.2) {
			bead.volume = Math.max(0, bead.volume - 0.03 * dt);
		}

		if (bead.volume <= 0.01) {
			state.surfaceBeads.splice(index, 1);
		} else if (bead.u <= 0) {
			surface.leftReservoir += bead.volume;
			state.surfaceBeads.splice(index, 1);
		} else if (bead.u >= 1) {
			surface.rightReservoir += bead.volume;
			state.surfaceBeads.splice(index, 1);
		}
	}

	for (const surface of state.surfaces) {
		const releaseVolume = getSurfaceRunoffThreshold(surface);
		for (const side of ["left", "right"] as const) {
			const reservoirKey = side === "left" ? "leftReservoir" : "rightReservoir";
			const progressKey =
				side === "left" ? "leftFlowProgress" : "rightFlowProgress";
			if (surface[reservoirKey] <= 0.01) {
				surface[reservoirKey] = 0;
				surface[progressKey] = 0;
				continue;
			}

			if (surface[progressKey] < 1) {
				const pathLength = Math.max(1, getSurfaceRunoffPathLength(surface));
				const travelled = surface[progressKey] * pathLength;
				// Gravity accelerates the attached rivulet as it wraps onto the side.
				// Adhesion keeps the motion slower than a freely falling droplet.
				const speed =
					(22 + Math.sqrt(2 * 360 * travelled)) *
					Math.min(1.18, 0.88 + surface[reservoirKey] * 0.12);
				surface[progressKey] = Math.min(
					1,
					surface[progressKey] + (speed / pathLength) * dt,
				);
			}

			const recentlyReleased = state.runoffDrops.some(
				(drop) =>
					drop.sourceSurfaceId === surface.id &&
					drop.sourceSide === side &&
					drop.age < 0.22,
			);
			if (
				surface[progressKey] >= 1 &&
				surface[reservoirKey] >= releaseVolume &&
				!recentlyReleased &&
				state.runoffDrops.length < MAX_RUNOFF_DROP_COUNT
			) {
				surface[reservoirKey] -= releaseVolume;
				emitRunoff(state, surface, side, releaseVolume, random);
				if (surface[reservoirKey] <= 0.01) {
					surface[reservoirKey] = 0;
					surface[progressKey] = 0;
				}
			}
		}
	}
};

const DROP_WATER_VOLUME: Record<RainLayer, number> = {
	far: 0,
	mid: 0.02,
	near: 0.14,
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
		if (drop.age < 0) continue;
		// Detached drips accelerate at the same gravity as the rain field.
		drop.vy += RAIN_GRAVITY * dt;
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
			depositSurfaceWater(state, hit, drop.volume * 0.8, drop.vx * 0.08);
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
			depositSurfaceWater(
				state,
				surfaceHit,
				DROP_WATER_VOLUME[drop.layer],
				drop.vx * 0.08,
			);
			// Only top-facing hits splash visibly; side grazes recycle silently
			// so no sideways ejecta reads as a rendering artifact.
			if (
				surfaceHit.normalY < -0.2 &&
				(drop.layer === "near" ||
					(drop.layer === "mid" && random() < MID_SURFACE_SPLASH_CHANCE))
			) {
				spawnImpact(
					state,
					surfaceHit,
					drop.speed,
					drop.alpha,
					config.strokeWidth,
					random,
					0.7,
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
