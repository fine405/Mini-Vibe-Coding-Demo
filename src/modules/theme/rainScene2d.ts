/**
 * Hybrid renderer for the Drizzle rainfall simulation.
 *
 * Rain streaks and impacts remain crisp, inexpensive Canvas 2D strokes.
 * Attached runoff uses a small WebGL 2 SDF layer for continuous neck and bulb
 * shapes, with the equivalent Canvas 2D geometry as its compatibility path.
 * The simulation itself lives in rainfall.ts and stays renderer-agnostic.
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
	getPendantBulbSize,
	getSurfaceRunoff,
	getSurfaceRunoffPathLength,
	getSurfaceRunoffPoint,
	getSurfaceRunoffThreshold,
	MIN_VISIBLE_SURFACE_WATER_VOLUME,
	RAIN_LAYER_CONFIG,
	type RainfallState,
	setRainSurfaces,
	setRainTextSurfaces,
	stepRainfall,
} from "@/modules/theme/rainfall";
import {
	type RainSurfaceGeometry,
	signedDistanceToRainSurface,
} from "@/modules/theme/rainSurfaces";
import {
	type RainTextSurfaceGeometry,
	signedDistanceToRainTextSurface,
} from "@/modules/theme/rainTextSurfaces";
import { createRainWaterRenderer } from "@/modules/theme/rainWaterWebgl2";

export interface RainSceneHandle {
	update: (dt: number, audioTime?: number | null) => void;
	renderStill: () => void;
	resize: (width: number, height: number) => void;
	setSurfaces: (
		surfaces: readonly RainSurfaceGeometry[],
		textSurfaces?: readonly RainTextSurfaceGeometry[],
	) => void;
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
	surfaces: RainfallState["surfaces"],
	textSurfaces: RainfallState["textSurfaces"],
	forceVisible: boolean,
): void => {
	const config = RAIN_LAYER_CONFIG[drop.layer];
	const alpha = drop.alpha * (forceVisible ? 1 : getDropFade(drop));
	if (alpha <= 0) return;

	const velocityLength = Math.hypot(drop.vx, drop.speed) || 1;
	const streakX = (drop.vx / velocityLength) * drop.streakLength;
	const streakY = (drop.speed / velocityLength) * drop.streakLength;

	// Cull streaks clipping into a component: the head check catches drops
	// swallowed by a moving box, the midpoint check catches tails dipping in.
	if (
		surfaces.some(
			(surface) =>
				signedDistanceToRainSurface(drop, surface) <= 0 ||
				signedDistanceToRainSurface(
					{ x: drop.x - streakX * 0.5, y: drop.y - streakY * 0.5 },
					surface,
				) <= 0,
		) ||
		textSurfaces.some(
			(surface) =>
				signedDistanceToRainTextSurface(drop, surface) <= 0 ||
				signedDistanceToRainTextSurface(
					{ x: drop.x - streakX * 0.5, y: drop.y - streakY * 0.5 },
					surface,
				) <= 0,
		)
	) {
		return;
	}

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

const drawTopSurfaceWater = (
	ctx: CanvasRenderingContext2D,
	state: RainfallState,
): void => {
	for (const bead of state.surfaceBeads) {
		const surface = state.surfaces.find(
			(candidate) => candidate.id === bead.surfaceId,
		);
		if (!surface) continue;
		if (bead.volume < MIN_VISIBLE_SURFACE_WATER_VOLUME) continue;
		const radius = Math.min(surface.radius, surface.width * 0.5);
		const trackLeft = surface.x + radius;
		const trackWidth = Math.max(1, surface.width - radius * 2);
		const x = trackLeft + bead.u * trackWidth;
		const halfWidth = Math.min(13, 4 + Math.sqrt(bead.volume) * 7);
		const depth = Math.min(0.9, 0.18 + Math.sqrt(bead.volume) * 0.64);
		const baselineY = surface.y + 0.24;
		const asymmetry = Math.sin(bead.u * 47 + bead.volume * 3) * 0.12;
		const alpha = Math.min(0.17, 0.055 + bead.volume * 0.09);
		// A pinned, shallow film follows the edge instead of reading as a row of
		// identical domed beads. Its position changes only when new water lands.
		ctx.fillStyle = `rgba(${STREAK_RGB}, ${alpha})`;
		ctx.beginPath();
		ctx.moveTo(x - halfWidth, baselineY);
		ctx.bezierCurveTo(
			x - halfWidth * 0.68,
			baselineY - depth * (0.42 + asymmetry),
			x - halfWidth * 0.28,
			baselineY - depth * 0.94,
			x + halfWidth * 0.05,
			baselineY - depth,
		);
		ctx.bezierCurveTo(
			x + halfWidth * 0.42,
			baselineY - depth * (0.84 - asymmetry),
			x + halfWidth * 0.76,
			baselineY - depth * 0.32,
			x + halfWidth,
			baselineY,
		);
		ctx.quadraticCurveTo(x, baselineY + 0.16, x - halfWidth, baselineY);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.13, alpha * 0.8)})`;
		ctx.lineWidth = 0.45;
		ctx.beginPath();
		ctx.moveTo(x - halfWidth * 0.32, baselineY - depth * 0.72);
		ctx.quadraticCurveTo(
			x - halfWidth * 0.12,
			baselineY - depth * 0.94,
			x + halfWidth * 0.08,
			baselineY - depth * 0.88,
		);
		ctx.stroke();
	}
};

const drawPendant2d = (
	ctx: CanvasRenderingContext2D,
	anchor: { x: number; y: number },
	volume: number,
	threshold: number,
	length: number,
	pinch: number,
	alpha: number,
): void => {
	const bulb = getPendantBulbSize(volume, threshold, pinch);
	const bulbCenterY = anchor.y + Math.max(bulb.radiusY * 0.42, length);
	const neck = Math.max(0.16, bulb.radiusX * (0.44 - pinch * 0.34));
	ctx.fillStyle = `rgba(${STREAK_RGB}, ${alpha})`;
	ctx.beginPath();
	ctx.moveTo(anchor.x - neck, anchor.y);
	ctx.bezierCurveTo(
		anchor.x - neck,
		anchor.y + (bulbCenterY - anchor.y) * 0.48,
		anchor.x - bulb.radiusX,
		bulbCenterY - bulb.radiusY * 0.55,
		anchor.x - bulb.radiusX,
		bulbCenterY,
	);
	ctx.bezierCurveTo(
		anchor.x - bulb.radiusX,
		bulbCenterY + bulb.radiusY * 0.72,
		anchor.x - bulb.radiusX * 0.45,
		bulbCenterY + bulb.radiusY,
		anchor.x,
		bulbCenterY + bulb.radiusY,
	);
	ctx.bezierCurveTo(
		anchor.x + bulb.radiusX * 0.45,
		bulbCenterY + bulb.radiusY,
		anchor.x + bulb.radiusX,
		bulbCenterY + bulb.radiusY * 0.72,
		anchor.x + bulb.radiusX,
		bulbCenterY,
	);
	ctx.bezierCurveTo(
		anchor.x + bulb.radiusX,
		bulbCenterY - bulb.radiusY * 0.55,
		anchor.x + neck,
		anchor.y + (bulbCenterY - anchor.y) * 0.48,
		anchor.x + neck,
		anchor.y,
	);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.42})`;
	ctx.beginPath();
	ctx.ellipse(
		anchor.x - bulb.radiusX * 0.3,
		bulbCenterY - bulb.radiusY * 0.28,
		bulb.radiusX * 0.16,
		bulb.radiusY * 0.24,
		0,
		0,
		Math.PI * 2,
	);
	ctx.fill();
};

const drawRunoffWater2d = (
	ctx: CanvasRenderingContext2D,
	state: RainfallState,
): void => {
	for (const surface of state.surfaces) {
		for (const side of ["left", "right"] as const) {
			const runoff = getSurfaceRunoff(surface, side);
			const threshold = getSurfaceRunoffThreshold(
				surface,
				side,
				runoff.releaseIndex,
			);
			const fill = Math.min(1.2, runoff.volume / threshold);
			if (runoff.progress <= 0 && runoff.residue <= 0.01) continue;
			const hasLiveTrail = runoff.volume > 0.02;

			if (
				!hasLiveTrail &&
				runoff.residue > 0.01 &&
				runoff.residueEnd > runoff.residueStart
			) {
				ctx.strokeStyle = `rgba(${STREAK_RGB}, ${runoff.residue * 0.045})`;
				ctx.lineWidth = 0.26 + runoff.residue * 0.16;
				ctx.beginPath();
				for (let index = 0; index <= 7; index++) {
					const sampleProgress =
						runoff.residueStart +
						((runoff.residueEnd - runoff.residueStart) * index) / 7;
					const point = getSurfaceRunoffPoint(surface, side, sampleProgress);
					if (index === 0) ctx.moveTo(point.x, point.y);
					else ctx.lineTo(point.x, point.y);
				}
				ctx.stroke();
			}

			// Draw only the local wet trail behind the moving head. Keeping the
			// whole outline lit would look like a decorative border animation.
			if (hasLiveTrail) {
				const pathLength = Math.max(1, getSurfaceRunoffPathLength(surface));
				const tailLength = Math.min(14, 4 + fill * 10);
				const tailProgress = Math.max(
					0,
					runoff.progress - tailLength / pathLength,
				);
				ctx.strokeStyle = `rgba(${STREAK_RGB}, ${0.045 + fill * 0.14})`;
				ctx.lineWidth = 0.5 + fill * 0.55;
				ctx.beginPath();
				for (let index = 0; index <= 7; index++) {
					const sampleProgress =
						tailProgress + ((runoff.progress - tailProgress) * index) / 7;
					const point = getSurfaceRunoffPoint(surface, side, sampleProgress);
					if (index === 0) ctx.moveTo(point.x, point.y);
					else ctx.lineTo(point.x, point.y);
				}
				ctx.stroke();
			}

			const head = getSurfaceRunoffPoint(surface, side, runoff.progress);
			if (runoff.progress < 1 && runoff.volume > 0.02) {
				ctx.fillStyle = `rgba(${STREAK_RGB}, ${0.07 + fill * 0.2})`;
				ctx.beginPath();
				ctx.ellipse(
					head.x,
					head.y,
					0.4 + fill * 0.42,
					0.55 + fill * 0.55,
					0,
					0,
					Math.PI * 2,
				);
				ctx.fill();
			} else if (runoff.recoil > 0 && runoff.pendantLength > 0.05) {
				ctx.strokeStyle = `rgba(${STREAK_RGB}, ${runoff.recoil * 0.19})`;
				ctx.lineWidth = 0.34 + runoff.recoil * 0.38;
				ctx.beginPath();
				ctx.moveTo(head.x, head.y);
				ctx.lineTo(head.x, head.y + runoff.pendantLength);
				ctx.stroke();
			} else if (runoff.progress >= 1 && runoff.volume > 0.01) {
				drawPendant2d(
					ctx,
					head,
					runoff.volume,
					threshold,
					runoff.pendantLength,
					runoff.pinch,
					0.14 + Math.min(1, fill) * 0.25,
				);
			}
		}
	}

	for (const drop of state.runoffDrops) {
		const speed = Math.hypot(drop.vx, drop.vy);
		const alpha = drop.alpha;
		const tailLength = Math.min(7, speed * 0.012);
		const directionX = speed > 0 ? drop.vx / speed : 0;
		const directionY = speed > 0 ? drop.vy / speed : 1;
		ctx.strokeStyle = `rgba(${STREAK_RGB}, ${alpha * 0.32})`;
		ctx.lineWidth = drop.size * 0.55;
		ctx.beginPath();
		ctx.moveTo(
			drop.x - directionX * tailLength,
			drop.y - directionY * tailLength,
		);
		ctx.lineTo(drop.x, drop.y);
		ctx.stroke();
		ctx.fillStyle = `rgba(238, 245, 250, ${alpha})`;
		ctx.beginPath();
		const stretch = 1 + Math.min(0.55, speed / 850);
		ctx.ellipse(
			drop.x,
			drop.y,
			(drop.size * drop.aspect) / Math.sqrt(stretch),
			drop.size * stretch,
			Math.atan2(drop.vy, drop.vx) - Math.PI * 0.5,
			0,
			Math.PI * 2,
		);
		ctx.fill();
		// Specular glint so the falling drip reads as water, not a dash.
		ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.55})`;
		ctx.beginPath();
		ctx.ellipse(
			drop.x - drop.size * drop.aspect * 0.2,
			drop.y - drop.size * 0.34,
			drop.size * 0.16,
			drop.size * 0.24,
			0,
			0,
			Math.PI * 2,
		);
		ctx.fill();
	}
};

const draw = (
	ctx: CanvasRenderingContext2D,
	state: RainfallState,
	visual: DrizzleVisualState,
	forceVisible = false,
	drawFallbackRunoff = true,
): void => {
	ctx.clearRect(0, 0, state.width, state.height);
	ctx.lineCap = "round";
	drawLightning(ctx, state, visual);

	for (const drop of state.drops) {
		drawDrop(ctx, drop, state.surfaces, state.textSurfaces, forceVisible);
	}
	if (drawFallbackRunoff) {
		drawTopSurfaceWater(ctx, state);
		drawRunoffWater2d(ctx, state);
	}

	for (const glint of state.textGlints) {
		const progress = glint.age / glint.lifetime;
		const alpha = glint.alpha * (1 - progress) * (1 - progress);
		if (alpha <= 0) continue;
		const radius = glint.radius * (0.8 + progress * 0.2);
		ctx.fillStyle = `rgba(244, 249, 252, ${alpha})`;
		ctx.beginPath();
		ctx.arc(glint.x, glint.y, radius, 0, Math.PI * 2);
		ctx.fill();
	}

	for (const spray of state.sprays) {
		const alpha = spray.alpha * (1 - spray.age / spray.lifetime);
		if (alpha <= 0) continue;
		// Ejecta that falls back into a component would read as a glitch.
		if (
			state.surfaces.some(
				(surface) => signedDistanceToRainSurface(spray, surface) <= 0,
			) ||
			state.textSurfaces.some(
				(surface) => signedDistanceToRainTextSurface(spray, surface) <= 0,
			)
		) {
			continue;
		}
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
			ring.y,
			radiusX,
			radiusX * RING_ASPECT,
			ring.tangentAngle,
			0,
			Math.PI * 2,
		);
		ctx.stroke();
	}
};

export const createRainScene = (
	canvas: HTMLCanvasElement,
	waterCanvas: HTMLCanvasElement | null,
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
	const getDpr = () =>
		Math.min(
			MAX_DEVICE_PIXEL_RATIO,
			typeof window.devicePixelRatio === "number" ? window.devicePixelRatio : 1,
		);
	const waterRenderer = waterCanvas
		? createRainWaterRenderer(waterCanvas, width, height, getDpr())
		: null;

	const applySize = () => {
		const dpr = getDpr();
		canvas.width = Math.round(state.width * dpr);
		canvas.height = Math.round(state.height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		waterRenderer?.resize(state.width, state.height, dpr);
	};
	applySize();
	const renderFrame = (forceVisible = false) => {
		const renderedWithWebGl = waterRenderer?.render(state) ?? false;
		draw(ctx, state, visual, forceVisible, !renderedWithWebGl);
	};

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
			renderFrame();
		},
		renderStill: () => renderFrame(true),
		resize: (nextWidth: number, nextHeight: number) => {
			const surfaces = state.surfaces;
			const textSurfaces = state.textSurfaces;
			state = createRainfall(nextWidth, nextHeight, random, visual.intensity);
			setRainSurfaces(state, surfaces);
			setRainTextSurfaces(state, textSurfaces);
			applySize();
		},
		setSurfaces: (
			surfaces: readonly RainSurfaceGeometry[],
			textSurfaces: readonly RainTextSurfaceGeometry[] = [],
		) => {
			setRainSurfaces(state, surfaces);
			setRainTextSurfaces(state, textSurfaces);
		},
		dispose: () => {
			state.drops = [];
			state.sprays = [];
			state.rings = [];
			state.textGlints = [];
			state.surfaces = [];
			state.textSurfaces = [];
			state.surfaceBeads = [];
			state.runoffDrops = [];
			waterRenderer?.dispose();
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		},
	};
};
