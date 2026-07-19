/**
 * Canvas 2D renderer for the Drizzle rainfall simulation.
 *
 * Rain streaks are short line segments along the drop's velocity vector —
 * the same motion blur a camera produces — so plain Canvas 2D strokes are a
 * better fit than a WebGL scene here: a few hundred round-capped lines per
 * frame, no extra bundle weight, and crisp 1px geometry. The simulation
 * itself lives in rainfall.ts and stays renderer-agnostic.
 *
 * Exposes the same handle shape as snowScene.ts so the theme component can
 * swap between the two effects uniformly.
 */

import {
	createRainfall,
	getDropFade,
	RAIN_LAYER_CONFIG,
	type RainfallState,
	stepRainfall,
} from "@/modules/theme/rainfall";

export interface RainSceneHandle {
	update: (dt: number) => void;
	renderStill: () => void;
	resize: (width: number, height: number) => void;
	dispose: () => void;
}

/** Pale bluish-white water color; alpha comes from the simulation. */
const STREAK_RGB = "226, 235, 243";

/**
 * Seconds of camera exposure faked into each streak: length = v * EXPOSURE.
 * ~1/20s gives 13–31px streaks across the layer speeds.
 */
const STREAK_EXPOSURE_SECONDS = 0.05;
const SPRAY_EXPOSURE_SECONDS = 0.03;
/** Crown rings render as squashed ellipses, viewed at a shallow angle. */
const RING_ASPECT = 0.35;

const MAX_DEVICE_PIXEL_RATIO = 2;

const draw = (ctx: CanvasRenderingContext2D, state: RainfallState): void => {
	ctx.clearRect(0, 0, state.width, state.height);
	ctx.lineCap = "round";

	for (const drop of state.drops) {
		const config = RAIN_LAYER_CONFIG[drop.layer];
		const alpha = drop.alpha * getDropFade(drop);
		if (alpha <= 0) continue;
		ctx.strokeStyle = `rgba(${STREAK_RGB}, ${alpha})`;
		ctx.lineWidth = config.strokeWidth;
		ctx.beginPath();
		ctx.moveTo(
			drop.x - drop.vx * STREAK_EXPOSURE_SECONDS,
			drop.y - drop.speed * STREAK_EXPOSURE_SECONDS,
		);
		ctx.lineTo(drop.x, drop.y);
		ctx.stroke();
	}

	for (const spray of state.sprays) {
		const alpha = spray.alpha * (1 - spray.age / spray.lifetime);
		if (alpha <= 0) continue;
		ctx.strokeStyle = `rgba(${STREAK_RGB}, ${alpha})`;
		ctx.lineWidth = spray.size;
		ctx.beginPath();
		ctx.moveTo(
			spray.x - spray.vx * SPRAY_EXPOSURE_SECONDS,
			spray.y - spray.vy * SPRAY_EXPOSURE_SECONDS,
		);
		ctx.lineTo(spray.x, spray.y);
		ctx.stroke();
	}

	for (const ring of state.rings) {
		const progress = ring.age / ring.lifetime;
		const alpha = ring.alpha * (1 - progress);
		if (alpha <= 0) continue;
		const radiusX = ring.maxRadius * progress;
		ctx.strokeStyle = `rgba(${STREAK_RGB}, ${alpha})`;
		ctx.lineWidth = 0.8;
		ctx.beginPath();
		ctx.ellipse(
			ring.x,
			ring.groundY,
			radiusX,
			radiusX * RING_ASPECT,
			0,
			0,
			Math.PI * 2,
		);
		ctx.stroke();
	}
};

export const createRainScene = (
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
	random: () => number = Math.random,
): RainSceneHandle | null => {
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	let state = createRainfall(width, height, random);

	const applySize = () => {
		const dpr = Math.min(
			MAX_DEVICE_PIXEL_RATIO,
			typeof window.devicePixelRatio === "number" ? window.devicePixelRatio : 1,
		);
		canvas.width = Math.round(state.width * dpr);
		canvas.height = Math.round(state.height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	};
	applySize();

	return {
		update: (dt: number) => {
			stepRainfall(state, dt, random);
			draw(ctx, state);
		},
		renderStill: () => draw(ctx, state),
		resize: (nextWidth: number, nextHeight: number) => {
			state = createRainfall(nextWidth, nextHeight, random);
			applySize();
		},
		dispose: () => {
			state.drops = [];
			state.sprays = [];
			state.rings = [];
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		},
	};
};
