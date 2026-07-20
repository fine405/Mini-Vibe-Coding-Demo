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
import {
	findRainTextSurfaceHit,
	type RainTextSurfaceGeometry,
} from "@/modules/theme/rainTextSurfaces";

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

export type SurfaceRunoffSide = "left" | "right";

/** Water attached to one side of a rounded component. */
export interface SurfaceRunoffState {
	volume: number;
	/** Normalized travel from the top tangent to the bottom tangent. */
	progress: number;
	/** Tangential velocity along the rounded-rectangle outline, in px/s. */
	velocity: number;
	/** Distance from the bottom anchor to the pendant bulb center, in px. */
	pendantLength: number;
	pendantVelocity: number;
	/** 0 while stable, 1 when the attached neck pinches off. */
	pinch: number;
	/** Brief wet filament left after a release. */
	recoil: number;
	releaseIndex: number;
}

export interface WetRainSurface extends RainSurfaceGeometry {
	leftRunoff: SurfaceRunoffState;
	rightRunoff: SurfaceRunoffState;
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
	aspect: number;
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
	textSurfaces: RainTextSurfaceGeometry[];
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
		textSurfaces: [],
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
	impactScale = 1,
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
		maxRadius: getCrownRadius(impactSpeed) * impactScale,
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

const createSurfaceRunoff = (
	previous?: SurfaceRunoffState,
): SurfaceRunoffState => ({
	volume: previous?.volume ?? 0,
	progress: previous?.progress ?? 0,
	velocity: previous?.velocity ?? 0,
	pendantLength: previous?.pendantLength ?? 0,
	pendantVelocity: previous?.pendantVelocity ?? 0,
	pinch: previous?.pinch ?? 0,
	recoil: previous?.recoil ?? 0,
	releaseIndex: previous?.releaseIndex ?? 0,
});

export const getSurfaceRunoff = (
	surface: WetRainSurface,
	side: SurfaceRunoffSide,
): SurfaceRunoffState =>
	side === "left" ? surface.leftRunoff : surface.rightRunoff;

const addSurfaceRunoffWater = (
	surface: WetRainSurface,
	side: SurfaceRunoffSide,
	volume: number,
): void => {
	const runoff = getSurfaceRunoff(surface, side);
	runoff.volume += volume;
	if (runoff.progress < 1) {
		runoff.velocity = Math.max(runoff.velocity, 7 + Math.min(5, volume * 5));
	}
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
		leftRunoff: createSurfaceRunoff(previous.get(surface.id)?.leftRunoff),
		rightRunoff: createSurfaceRunoff(previous.get(surface.id)?.rightRunoff),
	}));
	const activeIds = new Set(state.surfaces.map((surface) => surface.id));
	state.surfaceBeads = state.surfaceBeads.filter((bead) =>
		activeIds.has(bead.surfaceId),
	);
};

export const setRainTextSurfaces = (
	state: RainfallState,
	surfaces: readonly RainTextSurfaceGeometry[],
): void => {
	state.textSurfaces = [...surfaces];
};

const SUBTLE_TEXT_IMPACT_SCALE = 0.4;

interface RainColliderHit {
	depositsWater: boolean;
	hit: RainSurfaceHit;
	impactScale: number;
	nearOnly: boolean;
}

const findFirstColliderHit = (
	start: { x: number; y: number },
	end: { x: number; y: number },
	surfaces: readonly RainSurfaceGeometry[],
	textSurfaces: readonly RainTextSurfaceGeometry[],
): RainColliderHit | null => {
	const surfaceHit = findRainSurfaceHit(start, end, surfaces);
	const textHit = findRainTextSurfaceHit(start, end, textSurfaces);
	if (textHit && (!surfaceHit || textHit.t < surfaceHit.t)) {
		const subtle = textHit.impact === "subtle";
		return {
			depositsWater: false,
			hit: textHit,
			impactScale: subtle ? SUBTLE_TEXT_IMPACT_SCALE : 1,
			nearOnly: subtle,
		};
	}
	if (!surfaceHit) return null;
	return {
		depositsWater: true,
		hit: surfaceHit,
		impactScale: 1,
		nearOnly: false,
	};
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
		addSurfaceRunoffWater(surface, "left", volume);
		return;
	}
	if (hit.normalX > 0.05) {
		addSurfaceRunoffWater(surface, "right", volume);
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
	side: SurfaceRunoffSide,
	releaseIndex = 0,
): number => {
	const base = Math.min(0.82, 0.38 + getSurfaceRunoffRadius(surface) / 80);
	const seed = `${surface.id}:${side}:${releaseIndex}`;
	let hash = 2166136261;
	for (let index = 0; index < seed.length; index++) {
		hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
	}
	const variation = 0.92 + ((hash >>> 0) / 4294967295) * 0.16;
	return base * variation;
};

export const getSurfaceRunoffPathLength = (
	surface: RainSurfaceGeometry,
): number => {
	const radius = getSurfaceRunoffRadius(surface);
	return Math.PI * radius + Math.max(0, surface.height - radius * 2);
};

/** Point along a rounded edge from its top tangent to its bottom tangent. */
export const getSurfaceRunoffPoint = (
	surface: RainSurfaceGeometry,
	side: SurfaceRunoffSide,
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

export interface SurfaceRunoffFrame {
	x: number;
	y: number;
	tangentX: number;
	tangentY: number;
}

/** Position and downhill tangent of the rounded edge at a normalized point. */
export const getSurfaceRunoffFrame = (
	surface: RainSurfaceGeometry,
	side: SurfaceRunoffSide,
	progress: number,
): SurfaceRunoffFrame => {
	const pathLength = Math.max(1, getSurfaceRunoffPathLength(surface));
	const step = Math.min(0.02, 1 / pathLength);
	const before = getSurfaceRunoffPoint(surface, side, progress - step);
	const after = getSurfaceRunoffPoint(surface, side, progress + step);
	const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
	const point = getSurfaceRunoffPoint(surface, side, progress);
	return {
		...point,
		tangentX: (after.x - before.x) / length,
		tangentY: (after.y - before.y) / length,
	};
};

export const getPendantBulbSize = (
	volume: number,
	threshold: number,
	pinch: number,
): { radiusX: number; radiusY: number } => {
	const fill = Math.min(1.25, Math.max(0, volume / threshold));
	return {
		radiusX: 0.88 + Math.sqrt(fill) * 1.52,
		radiusY: 1.02 + fill * 1.68 + pinch * 0.68,
	};
};

const getPendantTargetLength = (
	volume: number,
	threshold: number,
	pinch: number,
): number => {
	if (volume <= 0.01) return 0;
	const fill = Math.min(1.25, Math.max(0, volume / threshold));
	return 0.3 + 4.35 * fill ** 1.65 + 3.1 * pinch ** 1.7;
};

const emitRunoff = (
	state: RainfallState,
	surface: WetRainSurface,
	side: SurfaceRunoffSide,
	runoff: SurfaceRunoffState,
	volume: number,
	threshold: number,
	random: () => number,
): void => {
	if (state.runoffDrops.length >= MAX_RUNOFF_DROP_COUNT) return;
	const releaseFrame = getSurfaceRunoffFrame(surface, side, 1);
	const bulb = getPendantBulbSize(volume, threshold, 1);
	state.runoffDrops.push({
		x: releaseFrame.x,
		y: releaseFrame.y + Math.max(bulb.radiusY * 0.55, runoff.pendantLength),
		vx: releaseFrame.tangentX * (1.5 + random() * 2.5),
		vy: Math.max(9, runoff.pendantVelocity + 5 + random() * 4),
		age: 0,
		volume,
		alpha: 0.34,
		size: bulb.radiusY,
		aspect: bulb.radiusX / bulb.radiusY,
		sourceSurfaceId: surface.id,
		sourceSide: side,
	});
};

const SURFACE_FLOW_GRAVITY = 760;
const SURFACE_FLOW_DRAG = 3.8;
const PENDANT_SPRING = 82;
const PENDANT_DAMPING = 14;
const PENDANT_RECOIL_SECONDS = 0.12;

const stepAttachedRunoff = (
	state: RainfallState,
	surface: WetRainSurface,
	side: SurfaceRunoffSide,
	dt: number,
	random: () => number,
): void => {
	const runoff = getSurfaceRunoff(surface, side);
	runoff.recoil = Math.max(0, runoff.recoil - dt / PENDANT_RECOIL_SECONDS);

	if (runoff.volume > 0.01 && runoff.progress < 1) {
		const pathLength = Math.max(1, getSurfaceRunoffPathLength(surface));
		const frame = getSurfaceRunoffFrame(surface, side, runoff.progress);
		const lowerCorner = Math.min(
			1,
			Math.max(0, (runoff.progress - 0.58) / 0.42),
		);
		const drag =
			SURFACE_FLOW_DRAG + lowerCorner * (1 - Math.max(0, frame.tangentY)) * 9;
		const wettingPull = Math.max(0, 24 * (1 - runoff.progress / 0.09));
		const acceleration =
			SURFACE_FLOW_GRAVITY * Math.max(0, frame.tangentY) +
			wettingPull -
			drag * runoff.velocity;
		runoff.velocity = Math.max(3, runoff.velocity + acceleration * dt);
		const nextProgress = runoff.progress + (runoff.velocity / pathLength) * dt;
		if (nextProgress >= 1) {
			runoff.progress = 1;
			runoff.pendantVelocity = Math.max(
				runoff.pendantVelocity,
				runoff.velocity * Math.max(0, frame.tangentY) * 0.12,
			);
			runoff.velocity = 0;
		} else {
			runoff.progress = nextProgress;
		}
	}

	if (runoff.progress < 1) return;

	const threshold = getSurfaceRunoffThreshold(
		surface,
		side,
		runoff.releaseIndex,
	);
	const fill = runoff.volume / threshold;
	const pinchLimit =
		fill >= 1 ? 1 : Math.min(0.72, Math.max(0, ((fill - 0.72) / 0.28) * 0.72));
	if (runoff.pinch < pinchLimit) {
		// A real pendant neck thins slowly at first, then becomes unstable and
		// accelerates into release. The fill level controls that instability, so
		// there is no fixed dwell timer at the bottom tangent.
		const instability = 0.34 + runoff.pinch * runoff.pinch * 1.66;
		const pinchRate =
			(0.62 + Math.max(0, Math.min(1.35, fill) - 0.72) * 5.4) *
			instability *
			(1 - runoff.recoil * 0.7);
		runoff.pinch = Math.min(pinchLimit, runoff.pinch + pinchRate * dt);
	} else if (runoff.pinch > pinchLimit) {
		runoff.pinch = Math.max(pinchLimit, runoff.pinch - 2.4 * dt);
	}

	// The wet filament retracts immediately after separation, even if a small
	// residual volume remains attached at the contact point.
	const targetLength =
		runoff.recoil > 0
			? 0
			: getPendantTargetLength(runoff.volume, threshold, runoff.pinch);
	runoff.pendantVelocity +=
		(targetLength - runoff.pendantLength) * PENDANT_SPRING * dt;
	runoff.pendantVelocity *= Math.exp(-PENDANT_DAMPING * dt);
	runoff.pendantLength = Math.max(
		0,
		runoff.pendantLength + runoff.pendantVelocity * dt,
	);

	if (
		fill >= 1 &&
		runoff.pinch >= 0.999 &&
		state.runoffDrops.length < MAX_RUNOFF_DROP_COUNT
	) {
		// The unstable pendant is one connected mass; detaching all of it avoids
		// a second thin strand appearing from an arbitrary leftover packet.
		const releaseVolume = runoff.volume;
		emitRunoff(state, surface, side, runoff, releaseVolume, threshold, random);
		runoff.volume = 0;
		runoff.releaseIndex += 1;
		runoff.recoil = 1;
		runoff.pinch = 0;
		runoff.pendantVelocity = -Math.max(9, runoff.pendantVelocity * 0.35);
		if (runoff.volume <= 0.01) runoff.volume = 0;
	}

	if (runoff.volume <= 0.01 && runoff.recoil <= 0) {
		if (runoff.pendantLength <= 0.05) {
			runoff.progress = 0;
			runoff.velocity = 0;
			runoff.pendantLength = 0;
			runoff.pendantVelocity = 0;
		}
	}
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
			addSurfaceRunoffWater(surface, "left", bead.volume);
			state.surfaceBeads.splice(index, 1);
		} else if (bead.u >= 1) {
			addSurfaceRunoffWater(surface, "right", bead.volume);
			state.surfaceBeads.splice(index, 1);
		}
	}

	for (const surface of state.surfaces) {
		for (const side of ["left", "right"] as const) {
			stepAttachedRunoff(state, surface, side, dt, random);
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
		const collision = findFirstColliderHit(
			start,
			drop,
			candidateSurfaces,
			state.textSurfaces,
		);
		if (collision) {
			if (collision.depositsWater) {
				depositSurfaceWater(
					state,
					collision.hit,
					drop.volume * 0.8,
					drop.vx * 0.08,
				);
			}
			spawnImpact(
				state,
				collision.hit,
				Math.hypot(drop.vx, drop.vy),
				drop.alpha,
				drop.size * collision.impactScale,
				random,
				collision.impactScale,
				collision.impactScale,
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

		const collision = findFirstColliderHit(
			{ x: previousX, y: previousY },
			drop,
			state.surfaces,
			state.textSurfaces,
		);
		if (collision) {
			if (collision.depositsWater) {
				depositSurfaceWater(
					state,
					collision.hit,
					DROP_WATER_VOLUME[drop.layer],
					drop.vx * 0.08,
				);
			}
			// Only top-facing hits splash visibly; side grazes recycle silently
			// so no sideways ejecta reads as a rendering artifact.
			if (
				collision.hit.normalY < -0.2 &&
				(drop.layer === "near" ||
					(!collision.nearOnly &&
						drop.layer === "mid" &&
						random() < MID_SURFACE_SPLASH_CHANCE))
			) {
				spawnImpact(
					state,
					collision.hit,
					drop.speed,
					drop.alpha,
					config.strokeWidth * collision.impactScale,
					random,
					0.7 * collision.impactScale,
					collision.impactScale,
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
