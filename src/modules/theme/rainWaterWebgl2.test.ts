import { describe, expect, it } from "vitest";
import {
	createRainfall,
	depositSurfaceWater,
	getSurfaceRunoffThreshold,
	setRainSurfaces,
} from "@/modules/theme/rainfall";
import {
	buildRainWaterPrimitives,
	WATER_CAPSULE,
	WATER_ELLIPSE,
	WATER_FILM,
	WATER_MATERIAL_FILM,
	WATER_PENDANT,
} from "@/modules/theme/rainWaterWebgl2";

const steady = (value: number) => () => value;

describe("WebGL 2 rain water geometry", () => {
	it("renders pinned top-edge water as a shallow film material", () => {
		const state = createRainfall(240, 180, steady(0.5));
		setRainSurfaces(state, [
			{ height: 48, id: "input", radius: 14, width: 100, x: 70, y: 70 },
		]);
		depositSurfaceWater(
			state,
			{
				normalX: 0,
				normalY: -1,
				surfaceId: "input",
				t: 0,
				x: 120,
				y: 70,
			},
			0.5,
		);

		const films = buildRainWaterPrimitives(state).filter(
			(primitive) => primitive.kind === WATER_FILM,
		);

		expect(films).toHaveLength(1);
		expect(films[0]?.material).toBe(WATER_MATERIAL_FILM);
		expect(films[0]?.params[0]).toBeGreaterThan(4);
		expect(films[0]?.params[1]).toBeLessThan(1);
	});

	it("keeps faded edge residue separate from bulk water", () => {
		const state = createRainfall(240, 180, steady(0.5));
		setRainSurfaces(state, [
			{ height: 48, id: "brand", radius: 14, width: 100, x: 70, y: 70 },
		]);
		const runoff = state.surfaces[0]?.leftRunoff;
		expect(runoff).toBeDefined();
		if (!runoff) return;
		runoff.residue = 0.6;
		runoff.residueStart = 0.3;
		runoff.residueEnd = 0.52;

		const residue = buildRainWaterPrimitives(state).filter(
			(primitive) =>
				primitive.kind === WATER_CAPSULE &&
				primitive.material === WATER_MATERIAL_FILM,
		);

		expect(residue.length).toBeGreaterThan(0);
		expect(residue.every((primitive) => primitive.alpha < 0.08)).toBe(true);
	});

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
