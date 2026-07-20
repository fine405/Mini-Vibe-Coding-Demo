import { describe, expect, it } from "vitest";
import {
	buildRainTextSdf,
	findRainTextSurfaceHit,
	type RainTextSurfaceGeometry,
	signedDistanceToRainTextSurface,
} from "@/modules/theme/rainTextSurfaces";

const createTestSurface = (): RainTextSurfaceGeometry => {
	const fieldWidth = 9;
	const fieldHeight = 9;
	const alpha = new Uint8ClampedArray(fieldWidth * fieldHeight);
	for (let y = 2; y <= 6; y++) {
		for (const x of [2, 3, 6, 7]) alpha[y * fieldWidth + x] = 255;
	}
	const field = buildRainTextSdf(alpha, fieldWidth, fieldHeight);
	expect(field).not.toBeNull();
	return {
		field: field as Float32Array,
		fieldHeight,
		fieldWidth,
		height: fieldHeight,
		id: "title",
		impact: "standard",
		scale: 1,
		width: fieldWidth,
		x: 10,
		y: 20,
	};
};

describe("rain text surfaces", () => {
	it("keeps glyph pixels solid while letter gaps remain open", () => {
		const surface = createTestSurface();

		expect(
			signedDistanceToRainTextSurface({ x: 12.5, y: 22.5 }, surface),
		).toBeLessThan(0);
		expect(
			signedDistanceToRainTextSurface({ x: 14.5, y: 22.5 }, surface),
		).toBeGreaterThan(0);
	});

	it("finds the glyph edge and its upward-facing normal", () => {
		const surface = createTestSurface();
		const hit = findRainTextSurfaceHit({ x: 12.5, y: 18 }, { x: 12.5, y: 30 }, [
			surface,
		]);

		expect(hit).not.toBeNull();
		expect(hit?.surfaceId).toBe("title");
		expect(hit?.impact).toBe("standard");
		expect(hit?.normalY).toBeLessThan(-0.5);
	});

	it("does not create a bounding-box collision across a glyph gap", () => {
		const surface = createTestSurface();

		expect(
			findRainTextSurfaceHit({ x: 14.5, y: 18 }, { x: 14.5, y: 30 }, [surface]),
		).toBeNull();
	});
});
