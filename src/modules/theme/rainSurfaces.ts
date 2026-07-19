export interface RainPoint {
	x: number;
	y: number;
}

export interface RainSurfaceGeometry {
	height: number;
	id: string;
	radius: number;
	width: number;
	x: number;
	y: number;
}

export interface RainSurfaceHit extends RainPoint {
	normalX: number;
	normalY: number;
	surfaceId: string;
	/** Normalized contact time along the tested segment. */
	t: number;
}

const clampRadius = (surface: RainSurfaceGeometry): number =>
	Math.min(
		Math.max(0, surface.radius),
		surface.width * 0.5,
		surface.height * 0.5,
	);

/** Signed distance to a rounded rectangle in CSS-pixel screen space. */
export const signedDistanceToRainSurface = (
	point: RainPoint,
	surface: RainSurfaceGeometry,
): number => {
	const radius = clampRadius(surface);
	const halfWidth = surface.width * 0.5;
	const halfHeight = surface.height * 0.5;
	const qx = Math.abs(point.x - (surface.x + halfWidth)) - (halfWidth - radius);
	const qy =
		Math.abs(point.y - (surface.y + halfHeight)) - (halfHeight - radius);
	return (
		Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
		Math.min(Math.max(qx, qy), 0) -
		radius
	);
};

const getSurfaceNormal = (
	point: RainPoint,
	surface: RainSurfaceGeometry,
): RainPoint => {
	const epsilon = 0.25;
	const dx =
		signedDistanceToRainSurface({ x: point.x + epsilon, y: point.y }, surface) -
		signedDistanceToRainSurface({ x: point.x - epsilon, y: point.y }, surface);
	const dy =
		signedDistanceToRainSurface({ x: point.x, y: point.y + epsilon }, surface) -
		signedDistanceToRainSurface({ x: point.x, y: point.y - epsilon }, surface);
	const length = Math.hypot(dx, dy);
	if (length > 1e-6) return { x: dx / length, y: dy / length };
	return { x: 0, y: -1 };
};

const getPointOnSegment = (
	start: RainPoint,
	end: RainPoint,
	t: number,
): RainPoint => ({
	x: start.x + (end.x - start.x) * t,
	y: start.y + (end.y - start.y) * t,
});

const findHitForSurface = (
	start: RainPoint,
	end: RainPoint,
	surface: RainSurfaceGeometry,
): RainSurfaceHit | null => {
	const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
	const sampleCount = Math.min(64, Math.max(1, Math.ceil(segmentLength / 4)));
	let previousT = 0;
	const startDistance = signedDistanceToRainSurface(start, surface);

	if (startDistance <= 0) {
		const normal = getSurfaceNormal(start, surface);
		return {
			normalX: normal.x,
			normalY: normal.y,
			surfaceId: surface.id,
			t: 0,
			x: start.x,
			y: start.y,
		};
	}

	for (let sample = 1; sample <= sampleCount; sample++) {
		const sampleT = sample / sampleCount;
		const samplePoint = getPointOnSegment(start, end, sampleT);
		const sampleDistance = signedDistanceToRainSurface(samplePoint, surface);
		if (sampleDistance > 0) {
			previousT = sampleT;
			continue;
		}

		let outsideT = previousT;
		let insideT = sampleT;
		for (let iteration = 0; iteration < 8; iteration++) {
			const middleT = (outsideT + insideT) * 0.5;
			const middlePoint = getPointOnSegment(start, end, middleT);
			if (signedDistanceToRainSurface(middlePoint, surface) > 0) {
				outsideT = middleT;
			} else {
				insideT = middleT;
			}
		}

		const point = getPointOnSegment(start, end, insideT);
		const normal = getSurfaceNormal(point, surface);
		return {
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

/** Returns the earliest component hit by a moving rain particle. */
export const findRainSurfaceHit = (
	start: RainPoint,
	end: RainPoint,
	surfaces: readonly RainSurfaceGeometry[],
): RainSurfaceHit | null => {
	let nearest: RainSurfaceHit | null = null;
	for (const surface of surfaces) {
		if (surface.width <= 0 || surface.height <= 0) continue;
		const hit = findHitForSurface(start, end, surface);
		if (hit && (!nearest || hit.t < nearest.t)) nearest = hit;
	}
	return nearest;
};
