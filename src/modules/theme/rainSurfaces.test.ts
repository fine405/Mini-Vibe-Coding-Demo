import { describe, expect, it } from "vitest";
import {
	findRainSurfaceHit,
	type RainSurfaceGeometry,
	signedDistanceToRainSurface,
} from "@/modules/theme/rainSurfaces";

const surface: RainSurfaceGeometry = {
	height: 40,
	id: "composer",
	radius: 12,
	width: 120,
	x: 40,
	y: 60,
};

describe("rain surface geometry", () => {
	it("finds the first contact even when a fast drop ends inside the surface", () => {
		const hit = findRainSurfaceHit({ x: 100, y: 10 }, { x: 100, y: 90 }, [
			surface,
		]);

		expect(hit).not.toBeNull();
		expect(hit?.surfaceId).toBe("composer");
		expect(hit?.x).toBeCloseTo(100, 1);
		expect(hit?.y).toBeCloseTo(60, 1);
		expect(hit?.normalY).toBeLessThan(-0.9);
	});

	it("keeps the empty corner outside a rounded rectangle", () => {
		expect(
			signedDistanceToRainSurface({ x: 40, y: 60 }, surface),
		).toBeGreaterThan(0);
		expect(
			findRainSurfaceHit({ x: 41, y: 20 }, { x: 41, y: 66 }, [surface]),
		).toBeNull();
	});

	it("returns the nearest surface when a segment crosses more than one", () => {
		const lower = { ...surface, id: "lower", y: 120 };
		const hit = findRainSurfaceHit({ x: 100, y: 0 }, { x: 100, y: 150 }, [
			lower,
			surface,
		]);

		expect(hit?.surfaceId).toBe("composer");
	});
});
