import type { RainPoint, RainSurfaceHit } from "@/modules/theme/rainSurfaces";

export type RainTextImpact = "standard" | "subtle";

/** A cached, screen-space signed distance field for one DOM text element. */
export interface RainTextSurfaceGeometry {
	field: Float32Array;
	fieldHeight: number;
	fieldWidth: number;
	height: number;
	id: string;
	impact: RainTextImpact;
	scale: number;
	width: number;
	x: number;
	y: number;
}

export interface RainTextSurfaceHit extends RainSurfaceHit {
	impact: RainTextImpact;
}

const CHAMFER_DIAGONAL = Math.SQRT2;
const FIELD_ALPHA_THRESHOLD = 64;
const MAX_HIT_SAMPLES = 96;

const relax = (
	distance: Float32Array,
	index: number,
	neighbor: number,
	cost: number,
): void => {
	if (neighbor < 0 || neighbor >= distance.length) return;
	distance[index] = Math.min(distance[index], distance[neighbor] + cost);
};

const chamferDistance = (
	inside: Uint8Array,
	width: number,
	height: number,
	seedInside: boolean,
): Float32Array => {
	const distance = new Float32Array(inside.length);
	for (let index = 0; index < inside.length; index++) {
		distance[index] =
			Boolean(inside[index]) === seedInside ? 0 : Number.MAX_VALUE;
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			if (x > 0) relax(distance, index, index - 1, 1);
			if (y > 0) {
				relax(distance, index, index - width, 1);
				if (x > 0) {
					relax(distance, index, index - width - 1, CHAMFER_DIAGONAL);
				}
				if (x + 1 < width) {
					relax(distance, index, index - width + 1, CHAMFER_DIAGONAL);
				}
			}
		}
	}

	for (let y = height - 1; y >= 0; y--) {
		for (let x = width - 1; x >= 0; x--) {
			const index = y * width + x;
			if (x + 1 < width) relax(distance, index, index + 1, 1);
			if (y + 1 < height) {
				relax(distance, index, index + width, 1);
				if (x > 0) {
					relax(distance, index, index + width - 1, CHAMFER_DIAGONAL);
				}
				if (x + 1 < width) {
					relax(distance, index, index + width + 1, CHAMFER_DIAGONAL);
				}
			}
		}
	}

	return distance;
};

/** Builds a signed field from alpha pixels; negative values are inside glyphs. */
export const buildRainTextSdf = (
	alpha: Uint8ClampedArray | Uint8Array,
	width: number,
	height: number,
): Float32Array | null => {
	if (width <= 0 || height <= 0 || alpha.length !== width * height) return null;
	const inside = new Uint8Array(alpha.length);
	let insideCount = 0;
	for (let index = 0; index < alpha.length; index++) {
		if (alpha[index] < FIELD_ALPHA_THRESHOLD) continue;
		inside[index] = 1;
		insideCount += 1;
	}
	if (insideCount === 0 || insideCount === inside.length) return null;

	const distanceToInside = chamferDistance(inside, width, height, true);
	const distanceToOutside = chamferDistance(inside, width, height, false);
	const field = new Float32Array(alpha.length);
	for (let index = 0; index < field.length; index++) {
		field[index] = inside[index]
			? -(distanceToOutside[index] - 0.5)
			: distanceToInside[index] - 0.5;
	}
	return field;
};

const sampleField = (
	surface: RainTextSurfaceGeometry,
	pixelX: number,
	pixelY: number,
): number => {
	const x0 = Math.floor(pixelX);
	const y0 = Math.floor(pixelY);
	const x1 = Math.min(surface.fieldWidth - 1, x0 + 1);
	const y1 = Math.min(surface.fieldHeight - 1, y0 + 1);
	const amountX = pixelX - x0;
	const amountY = pixelY - y0;
	const top =
		surface.field[y0 * surface.fieldWidth + x0] * (1 - amountX) +
		surface.field[y0 * surface.fieldWidth + x1] * amountX;
	const bottom =
		surface.field[y1 * surface.fieldWidth + x0] * (1 - amountX) +
		surface.field[y1 * surface.fieldWidth + x1] * amountX;
	return (top * (1 - amountY) + bottom * amountY) / surface.scale;
};

/** Samples the field in CSS-pixel screen coordinates. */
export const signedDistanceToRainTextSurface = (
	point: RainPoint,
	surface: RainTextSurfaceGeometry,
): number => {
	const pixelX = (point.x - surface.x) * surface.scale - 0.5;
	const pixelY = (point.y - surface.y) * surface.scale - 0.5;
	const clampedX = Math.min(surface.fieldWidth - 1, Math.max(0, pixelX));
	const clampedY = Math.min(surface.fieldHeight - 1, Math.max(0, pixelY));
	const outsideDistance =
		Math.hypot(pixelX - clampedX, pixelY - clampedY) / surface.scale;
	if (outsideDistance > 0) return outsideDistance;
	return sampleField(surface, clampedX, clampedY);
};

const getTextSurfaceNormal = (
	point: RainPoint,
	surface: RainTextSurfaceGeometry,
): RainPoint => {
	const epsilon = Math.max(0.5, 0.75 / surface.scale);
	const dx =
		signedDistanceToRainTextSurface(
			{ x: point.x + epsilon, y: point.y },
			surface,
		) -
		signedDistanceToRainTextSurface(
			{ x: point.x - epsilon, y: point.y },
			surface,
		);
	const dy =
		signedDistanceToRainTextSurface(
			{ x: point.x, y: point.y + epsilon },
			surface,
		) -
		signedDistanceToRainTextSurface(
			{ x: point.x, y: point.y - epsilon },
			surface,
		);
	const length = Math.hypot(dx, dy);
	if (length > 1e-6) return { x: dx / length, y: dy / length };
	return { x: 0, y: -1 };
};

const pointOnSegment = (
	start: RainPoint,
	end: RainPoint,
	t: number,
): RainPoint => ({
	x: start.x + (end.x - start.x) * t,
	y: start.y + (end.y - start.y) * t,
});

const segmentMayReachSurface = (
	start: RainPoint,
	end: RainPoint,
	surface: RainTextSurfaceGeometry,
): boolean =>
	Math.max(start.x, end.x) >= surface.x &&
	Math.min(start.x, end.x) <= surface.x + surface.width &&
	Math.max(start.y, end.y) >= surface.y &&
	Math.min(start.y, end.y) <= surface.y + surface.height;

const findHitForTextSurface = (
	start: RainPoint,
	end: RainPoint,
	surface: RainTextSurfaceGeometry,
): RainTextSurfaceHit | null => {
	if (!segmentMayReachSurface(start, end, surface)) return null;
	const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
	const sampleSpacing = Math.max(0.75, 1.5 / surface.scale);
	const sampleCount = Math.min(
		MAX_HIT_SAMPLES,
		Math.max(1, Math.ceil(segmentLength / sampleSpacing)),
	);
	if (signedDistanceToRainTextSurface(start, surface) <= 0) {
		const normal = getTextSurfaceNormal(start, surface);
		return {
			impact: surface.impact,
			normalX: normal.x,
			normalY: normal.y,
			surfaceId: surface.id,
			t: 0,
			x: start.x,
			y: start.y,
		};
	}

	let previousT = 0;
	for (let sample = 1; sample <= sampleCount; sample++) {
		const sampleT = sample / sampleCount;
		const samplePoint = pointOnSegment(start, end, sampleT);
		if (signedDistanceToRainTextSurface(samplePoint, surface) > 0) {
			previousT = sampleT;
			continue;
		}

		let outsideT = previousT;
		let insideT = sampleT;
		for (let iteration = 0; iteration < 8; iteration++) {
			const middleT = (outsideT + insideT) * 0.5;
			const middlePoint = pointOnSegment(start, end, middleT);
			if (signedDistanceToRainTextSurface(middlePoint, surface) > 0) {
				outsideT = middleT;
			} else {
				insideT = middleT;
			}
		}

		const point = pointOnSegment(start, end, insideT);
		const normal = getTextSurfaceNormal(point, surface);
		return {
			impact: surface.impact,
			normalX: normal.x,
			normalY: normal.y,
			surfaceId: surface.id,
			t: insideT,
			x: point.x,
			y: point.y,
		};
	}
	return null;
};

/** Returns the earliest glyph hit by a moving rain particle. */
export const findRainTextSurfaceHit = (
	start: RainPoint,
	end: RainPoint,
	surfaces: readonly RainTextSurfaceGeometry[],
): RainTextSurfaceHit | null => {
	let nearest: RainTextSurfaceHit | null = null;
	for (const surface of surfaces) {
		const hit = findHitForTextSurface(start, end, surface);
		if (hit && (!nearest || hit.t < nearest.t)) nearest = hit;
	}
	return nearest;
};
