/**
 * Pure snowfall simulation for the Snow theme.
 *
 * The model is intentionally renderer-agnostic (no three.js imports) so the
 * physics can be unit-tested in jsdom. Coordinates are CSS pixels with the
 * origin at the top-left and +y pointing down; `z` is a normalized depth in
 * [0, 1] where 0 is closest to the camera. The scene layer maps flakes into
 * a perspective volume, so distant flakes shrink, dim, and slow down.
 *
 * Motion follows the reference look of https://www.shadertoy.com/view/Mdt3Df
 * (layered parallax, sinusoidal sway) with more natural physics: per-layer
 * terminal velocities, size-correlated fall speed, behavior-specific
 * flutter/tumble, and slowly gusting wind with depth parallax.
 */

import {
	pickSnowflakeType,
	type SnowflakeBehavior,
	type SnowflakeType,
} from "@/modules/theme/snowflakes";

export type SnowLayer = "far" | "mid" | "near";

export interface Snowflake {
	/** Crystal type this flake is bound to (id/name/weight). */
	type: SnowflakeType;
	layer: SnowLayer;
	/** Wind-driven horizontal anchor; `x` is derived from it each step. */
	baseX: number;
	x: number;
	y: number;
	/** Normalized depth: 0 = nearest, 1 = farthest. */
	z: number;
	/** Bounding radius in CSS pixels before depth scaling. */
	radius: number;
	/** Terminal fall speed in px/s. */
	fallSpeed: number;
	swayAmplitude: number;
	swayFrequency: number;
	swayPhase: number;
	/** Continuous spin around the flake's own axis, rad/s. */
	spinSpeed: number;
	spinAngle: number;
	/** Flutter/pendulum rocking. */
	rockAmplitude: number;
	rockFrequency: number;
	rockPhase: number;
	/** Free tumble for dense crystals (graupel/rosette), rad/s. */
	tumbleSpeed: number;
	tumbleAngle: number;
	/** Seconds since spawn, drives the fade-in. */
	age: number;
}

export interface SnowfallState {
	width: number;
	height: number;
	time: number;
	flakes: Snowflake[];
}

interface LayerConfig {
	/** Share of the total flake count. */
	share: number;
	radius: [min: number, max: number];
	fallSpeed: [min: number, max: number];
	/** Depth band within [0, 1]. */
	z: [min: number, max: number];
	/** How strongly the global wind pushes this layer. */
	windFactor: number;
}

export const SNOW_LAYER_CONFIG: Record<SnowLayer, LayerConfig> = {
	far: {
		share: 0.45,
		radius: [1, 2.2],
		fallSpeed: [14, 24],
		z: [0.55, 1],
		windFactor: 0.35,
	},
	mid: {
		share: 0.35,
		radius: [2.2, 4],
		fallSpeed: [28, 48],
		z: [0.2, 0.55],
		windFactor: 0.65,
	},
	near: {
		share: 0.2,
		radius: [4, 7],
		fallSpeed: [55, 90],
		z: [0, 0.2],
		windFactor: 1,
	},
};

interface BehaviorMotion {
	fallFactor: number;
	swayFactor: number;
	windFactor: number;
	rockAmplitude: [min: number, max: number];
	rockFrequency: [min: number, max: number];
	spinSpeed: [min: number, max: number];
	tumbleSpeed: [min: number, max: number];
}

const BEHAVIOR_MOTION: Record<SnowflakeBehavior, BehaviorMotion> = {
	// Graupel is dense: falls fastest, plunges through gusts, tumbles freely.
	graupel: {
		fallFactor: 1.5,
		swayFactor: 0.3,
		windFactor: 0.5,
		rockAmplitude: [0, 0],
		rockFrequency: [1, 1],
		spinSpeed: [0, 0],
		tumbleSpeed: [1.5, 3.5],
	},
	plate: {
		fallFactor: 1,
		swayFactor: 1,
		windFactor: 1,
		rockAmplitude: [0.2, 0.4],
		rockFrequency: [0.8, 1.6],
		spinSpeed: [0.2, 0.8],
		tumbleSpeed: [0, 0],
	},
	// Dendrites have the most drag: slow fall, strong flutter, catch the wind.
	dendrite: {
		fallFactor: 0.85,
		swayFactor: 1.35,
		windFactor: 1.25,
		rockAmplitude: [0.3, 0.55],
		rockFrequency: [0.6, 1.3],
		spinSpeed: [0.15, 0.6],
		tumbleSpeed: [0, 0],
	},
	column: {
		fallFactor: 1.15,
		swayFactor: 0.7,
		windFactor: 0.85,
		rockAmplitude: [0.15, 0.3],
		rockFrequency: [0.5, 1],
		spinSpeed: [0.4, 1],
		tumbleSpeed: [0, 0],
	},
	needle: {
		fallFactor: 1.1,
		swayFactor: 0.6,
		windFactor: 0.8,
		rockAmplitude: [0.1, 0.25],
		rockFrequency: [0.5, 0.9],
		spinSpeed: [0.3, 0.9],
		tumbleSpeed: [0, 0],
	},
	rosette: {
		fallFactor: 1.2,
		swayFactor: 0.8,
		windFactor: 0.9,
		rockAmplitude: [0.1, 0.2],
		rockFrequency: [0.6, 1.1],
		spinSpeed: [0, 0],
		tumbleSpeed: [0.8, 2],
	},
};

/** Total flakes scale with viewport area, capped for performance. */
export const MAX_FLAKE_COUNT = 260;
export const MIN_FLAKE_COUNT = 120;

export const getFlakeCount = (width: number, height: number): number =>
	Math.min(
		MAX_FLAKE_COUNT,
		Math.max(MIN_FLAKE_COUNT, Math.round((width * height) / 12000)),
	);

export const getLayerCounts = (total: number): Record<SnowLayer, number> => {
	const far = Math.round(total * SNOW_LAYER_CONFIG.far.share);
	const near = Math.round(total * SNOW_LAYER_CONFIG.near.share);
	return { far, mid: total - far - near, near };
};

/**
 * Slowly gusting global wind in px/s. Two long-period sines keep the drift
 * meandering within a bounded range, like real snowfall gusts.
 */
export const getWindAt = (time: number): number =>
	6 + 9 * Math.sin(0.11 * time) + 5 * Math.sin(0.043 * time + 1.7);

export const WIND_RANGE: readonly [min: number, max: number] = [-8, 20];

const rand = (
	random: () => number,
	[min, max]: readonly [number, number],
): number => min + random() * (max - min);

const randomizeFlake = (
	flake: Snowflake,
	layer: SnowLayer,
	width: number,
	height: number,
	random: () => number,
	scatterVertically: boolean,
): void => {
	const config = SNOW_LAYER_CONFIG[layer];
	const type = pickSnowflakeType(random());
	const motion = BEHAVIOR_MOTION[type.behavior];

	const radius = rand(random, config.radius);
	// Larger flakes within a layer reach a higher terminal velocity.
	const sizeRatio =
		(radius - config.radius[0]) / (config.radius[1] - config.radius[0]);
	const fallSpeed =
		rand(random, config.fallSpeed) *
		(0.7 + 0.6 * sizeRatio) *
		motion.fallFactor;

	flake.type = type;
	flake.layer = layer;
	flake.radius = radius;
	flake.fallSpeed = fallSpeed;
	flake.z = rand(random, config.z);
	flake.baseX = random() * width;
	flake.x = flake.baseX;
	// On first spawn flakes fill the whole viewport; on respawn they re-enter
	// just above the top edge so the fall looks continuous.
	flake.y = scatterVertically ? random() * height : -radius * 2 - random() * 8;
	flake.swayAmplitude =
		rand(random, [6, 18]) * motion.swayFactor * (radius / 4 + 0.5);
	flake.swayFrequency = rand(random, [0.5, 1.4]);
	flake.swayPhase = random() * Math.PI * 2;
	flake.spinSpeed = rand(random, motion.spinSpeed) * (random() < 0.5 ? -1 : 1);
	flake.spinAngle = random() * Math.PI * 2;
	flake.rockAmplitude = rand(random, motion.rockAmplitude);
	flake.rockFrequency = rand(random, motion.rockFrequency);
	flake.rockPhase = random() * Math.PI * 2;
	flake.tumbleSpeed =
		rand(random, motion.tumbleSpeed) * (random() < 0.5 ? -1 : 1);
	flake.tumbleAngle = random() * Math.PI * 2;
	flake.age = 0;
};

const createFlake = (
	layer: SnowLayer,
	width: number,
	height: number,
	random: () => number,
): Snowflake => {
	const flake = {} as Snowflake;
	randomizeFlake(flake, layer, width, height, random, true);
	return flake;
};

export const createSnowfall = (
	width: number,
	height: number,
	random: () => number = Math.random,
): SnowfallState => {
	const counts = getLayerCounts(getFlakeCount(width, height));
	const flakes: Snowflake[] = [];
	for (const layer of ["far", "mid", "near"] as const) {
		for (let i = 0; i < counts[layer]; i++) {
			flakes.push(createFlake(layer, width, height, random));
		}
	}
	return { width, height, time: 0, flakes };
};

const WRAP_MARGIN_FACTOR = 4;

export const stepSnowfall = (
	state: SnowfallState,
	dt: number,
	random: () => number = Math.random,
): void => {
	if (dt <= 0) return;
	state.time += dt;
	const wind = getWindAt(state.time);

	for (const flake of state.flakes) {
		const layerConfig = SNOW_LAYER_CONFIG[flake.layer];
		const motion = BEHAVIOR_MOTION[flake.type.behavior];

		flake.age += dt;
		flake.y += flake.fallSpeed * dt;
		flake.baseX += wind * layerConfig.windFactor * motion.windFactor * dt;
		flake.x =
			flake.baseX +
			flake.swayAmplitude *
				Math.sin(state.time * flake.swayFrequency + flake.swayPhase);
		flake.spinAngle += flake.spinSpeed * dt;
		flake.tumbleAngle += flake.tumbleSpeed * dt;

		// Fallen out of view: recycle above the top edge with a fresh type.
		if (flake.y - flake.radius > state.height) {
			randomizeFlake(
				flake,
				flake.layer,
				state.width,
				state.height,
				random,
				false,
			);
			continue;
		}

		// Wind can push flakes past a side edge: wrap them to the other side.
		const margin = flake.radius * WRAP_MARGIN_FACTOR;
		if (flake.x < -margin) {
			flake.baseX += state.width + margin * 2;
		} else if (flake.x > state.width + margin) {
			flake.baseX -= state.width + margin * 2;
		}
	}
};

/** Fade-in factor for freshly spawned flakes, 1s ramp. */
export const getFlakeFade = (flake: Snowflake): number =>
	Math.min(1, flake.age / 1.2);
