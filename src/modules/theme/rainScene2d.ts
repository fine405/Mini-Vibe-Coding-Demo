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
	createDrizzleLoopClock,
	type DrizzleVisualState,
	getDrizzleVisualState,
} from "@/modules/theme/drizzleAudio";
import {
	createRainfall,
	getDropFade,
	RAIN_LAYER_CONFIG,
	type RainfallState,
	stepRainfall,
} from "@/modules/theme/rainfall";

export interface RainSceneHandle {
	update: (dt: number, audioTime?: number | null) => void;
	renderStill: () => void;
	resize: (width: number, height: number) => void;
	dispose: () => void;
}

/** Pale bluish-white water color; alpha comes from the simulation. */
const STREAK_RGB = "226, 235, 243";
const SPRAY_EXPOSURE_SECONDS = 0.03;
/** Crown rings render as squashed ellipses, viewed at a shallow angle. */
const RING_ASPECT = 0.35;

const MAX_DEVICE_PIXEL_RATIO = 2;

const drawLightning = (
	ctx: CanvasRenderingContext2D,
	state: RainfallState,
	visual: DrizzleVisualState,
): void => {
	const ambientAlpha = visual.thunder * 0.01 + visual.lightning * 0.075;
	if (ambientAlpha > 0) {
		ctx.fillStyle = `rgba(207, 222, 235, ${ambientAlpha})`;
		ctx.fillRect(0, 0, state.width, state.height);
	}
	if (visual.lightning <= 0) return;

	// A diffuse source above the viewport suggests cloud illumination without
	// drawing a decorative lightning bolt over the interface.
	const radius = Math.max(state.width, state.height) * 0.9;
	const glow = ctx.createRadialGradient(
		state.width * 0.28,
		0,
		0,
		state.width * 0.28,
		0,
		radius,
	);
	glow.addColorStop(0, `rgba(232, 241, 249, ${visual.lightning * 0.2})`);
	glow.addColorStop(0.45, `rgba(218, 231, 242, ${visual.lightning * 0.07})`);
	glow.addColorStop(1, "rgba(207, 222, 235, 0)");
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, state.width, state.height);
};

const drawDrop = (
	ctx: CanvasRenderingContext2D,
	drop: RainfallState["drops"][number],
	forceVisible: boolean,
): void => {
	const config = RAIN_LAYER_CONFIG[drop.layer];
	const alpha = drop.alpha * (forceVisible ? 1 : getDropFade(drop));
	if (alpha <= 0) return;

	const velocityLength = Math.hypot(drop.vx, drop.speed) || 1;
	const streakX = (drop.vx / velocityLength) * drop.streakLength;
	const streakY = (drop.speed / velocityLength) * drop.streakLength;

	// A dim full tail plus a short brighter head reads as water, not a needle.
	ctx.strokeStyle = `rgba(${STREAK_RGB}, ${alpha * 0.42})`;
	ctx.lineWidth = config.strokeWidth * 0.78;
	ctx.beginPath();
	ctx.moveTo(drop.x - streakX, drop.y - streakY);
	ctx.lineTo(drop.x, drop.y);
	ctx.stroke();

	ctx.strokeStyle = `rgba(${STREAK_RGB}, ${alpha * 0.95})`;
	ctx.lineWidth = config.strokeWidth;
	ctx.beginPath();
	ctx.moveTo(drop.x - streakX * 0.38, drop.y - streakY * 0.38);
	ctx.lineTo(drop.x, drop.y);
	ctx.stroke();
};

const draw = (
	ctx: CanvasRenderingContext2D,
	state: RainfallState,
	visual: DrizzleVisualState,
	forceVisible = false,
): void => {
	ctx.clearRect(0, 0, state.width, state.height);
	ctx.lineCap = "round";
	drawLightning(ctx, state, visual);

	for (const drop of state.drops) {
		drawDrop(ctx, drop, forceVisible);
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

	let visual = getDrizzleVisualState(0);
	let fallbackTimelineTime = 0;
	const audioLoopClock = createDrizzleLoopClock();
	let state = createRainfall(width, height, random, visual.intensity);

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
		update: (dt: number, audioTime: number | null = null) => {
			const safeDt = Math.min(0.05, Math.max(0, dt));
			fallbackTimelineTime += safeDt;
			const timelineTime =
				audioTime === null
					? fallbackTimelineTime
					: audioLoopClock.getTime(audioTime);
			visual = getDrizzleVisualState(timelineTime);
			stepRainfall(state, safeDt, random, visual);
			draw(ctx, state, visual);
		},
		renderStill: () => draw(ctx, state, visual, true),
		resize: (nextWidth: number, nextHeight: number) => {
			state = createRainfall(nextWidth, nextHeight, random, visual.intensity);
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
