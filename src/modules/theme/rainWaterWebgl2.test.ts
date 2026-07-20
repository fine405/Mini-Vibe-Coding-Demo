import { describe, expect, it } from "vitest";
import {
	createRainfall,
	getSurfaceRunoffThreshold,
	setRainSurfaces,
} from "@/modules/theme/rainfall";
import {
	buildRainWaterPrimitives,
	WATER_CAPSULE,
	WATER_ELLIPSE,
	WATER_PENDANT,
} from "@/modules/theme/rainWaterWebgl2";

const steady = (value: number) => () => value;

describe("WebGL 2 rain water geometry", () => {
	it("replaces the bottom head ellipse with one continuous pendant", () => {
		const state = createRainfall(240, 180, steady(0.5));
		const geometry = {
			height: 48,
			id: "brand",
			radius: 14,
			width: 100,
			x: 70,
			y: 70,
		};
		setRainSurfaces(state, [geometry]);
		const runoff = state.surfaces[0]?.leftRunoff;
		expect(runoff).toBeDefined();
		if (!runoff) return;
		runoff.volume = getSurfaceRunoffThreshold(geometry, "left");
		runoff.progress = 1;
		runoff.pendantLength = 6;
		runoff.pinch = 0.55;

		const primitives = buildRainWaterPrimitives(state);
		expect(
			primitives.filter((primitive) => primitive.kind === WATER_PENDANT),
		).toHaveLength(1);
		expect(
			primitives.filter((primitive) => primitive.kind === WATER_ELLIPSE),
		).toHaveLength(0);
	});

	it("narrows the attachment neck continuously during pinch-off", () => {
		const state = createRainfall(240, 180, steady(0.5));
		const geometry = {
			height: 48,
			id: "brand",
			radius: 14,
			width: 100,
			x: 70,
			y: 70,
		};
		setRainSurfaces(state, [geometry]);
		const runoff = state.surfaces[0]?.rightRunoff;
		expect(runoff).toBeDefined();
		if (!runoff) return;
		runoff.volume = getSurfaceRunoffThreshold(geometry, "right");
		runoff.progress = 1;
		runoff.pendantLength = 6;

		runoff.pinch = 0;
		const stable = buildRainWaterPrimitives(state).find(
			(primitive) => primitive.kind === WATER_PENDANT,
		);
		runoff.pinch = 0.9;
		const pinched = buildRainWaterPrimitives(state).find(
			(primitive) => primitive.kind === WATER_PENDANT,
		);

		expect(stable).toBeDefined();
		expect(pinched).toBeDefined();
		expect(pinched?.params[3]).toBeLessThan(stable?.params[3] ?? 0);
		expect(pinched?.params[2]).toBeGreaterThan(stable?.params[2] ?? 0);
	});

	it("renders the retracting filament before rebuilding a residual pendant", () => {
		const state = createRainfall(240, 180, steady(0.5));
		const geometry = {
			height: 48,
			id: "brand",
			radius: 14,
			width: 100,
			x: 70,
			y: 70,
		};
		setRainSurfaces(state, [geometry]);
		const runoff = state.surfaces[0]?.leftRunoff;
		expect(runoff).toBeDefined();
		if (!runoff) return;
		runoff.volume = getSurfaceRunoffThreshold(geometry, "left") * 0.08;
		runoff.progress = 1;
		runoff.pendantLength = 5;
		runoff.recoil = 0.7;

		const primitives = buildRainWaterPrimitives(state);
		expect(
			primitives.filter(
				(primitive) =>
					primitive.kind === WATER_CAPSULE && primitive.alpha > 0.1,
			),
		).toHaveLength(1);
		expect(
			primitives.filter((primitive) => primitive.kind === WATER_PENDANT),
		).toHaveLength(0);
	});
});
