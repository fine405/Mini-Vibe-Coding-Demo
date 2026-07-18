import { describe, expect, it } from "vitest";
import {
	createSnowfall,
	getFlakeCount,
	getFlakeFade,
	getLayerCounts,
	getWindAt,
	SNOW_LAYER_CONFIG,
	stepSnowfall,
	WIND_RANGE,
} from "@/modules/theme/snowfall3d";

const steady = (value: number) => () => value;

describe("snowfall simulation", () => {
	it("scales the flake count with viewport area within hard bounds", () => {
		expect(getFlakeCount(320, 480)).toBe(120);
		expect(getFlakeCount(8000, 4000)).toBe(260);
		const counts = getLayerCounts(getFlakeCount(1440, 900));
		expect(counts.far + counts.mid + counts.near).toBe(
			getFlakeCount(1440, 900),
		);
		expect(counts.far).toBeGreaterThan(counts.mid);
		expect(counts.mid).toBeGreaterThan(counts.near);
	});

	it("spawns bound flakes scattered across the whole viewport", () => {
		const state = createSnowfall(1440, 900, steady(0.5));

		expect(state.flakes.length).toBe(getFlakeCount(1440, 900));
		for (const flake of state.flakes) {
			expect(flake.type.id).toMatch(/^snow_/);
			expect(flake.type.name.length).toBeGreaterThan(0);
			expect(flake.y).toBeGreaterThanOrEqual(0);
			expect(flake.y).toBeLessThanOrEqual(900);
			expect(flake.x).toBeGreaterThanOrEqual(0);
			expect(flake.x).toBeLessThanOrEqual(1440);
			const config = SNOW_LAYER_CONFIG[flake.layer];
			expect(flake.z).toBeGreaterThanOrEqual(config.z[0]);
			expect(flake.z).toBeLessThanOrEqual(config.z[1]);
			expect(flake.radius).toBeGreaterThanOrEqual(config.radius[0]);
			expect(flake.radius).toBeLessThanOrEqual(config.radius[1]);
			expect(flake.age).toBe(0);
		}
	});

	it("keeps the gusting wind inside its published range", () => {
		for (let t = 0; t < 2000; t += 0.37) {
			const wind = getWindAt(t);
			expect(wind).toBeGreaterThanOrEqual(WIND_RANGE[0] - 1e-6);
			expect(wind).toBeLessThanOrEqual(WIND_RANGE[1] + 1e-6);
		}
	});

	it("moves flakes down and drifts them with wind and sway", () => {
		const state = createSnowfall(1440, 900, steady(0.5));
		const before = state.flakes.map((flake) => ({
			y: flake.y,
			baseX: flake.baseX,
		}));

		stepSnowfall(state, 0.5, steady(0.5));

		state.flakes.forEach((flake, index) => {
			const start = before[index];
			expect(start).toBeDefined();
			if (!start) return;
			expect(flake.y).toBeCloseTo(start.y + flake.fallSpeed * 0.5, 5);
			// Wind is always applied to the anchor; sway offsets x around it.
			expect(flake.baseX).not.toBe(start.baseX);
			expect(flake.x).toBeCloseTo(
				flake.baseX +
					flake.swayAmplitude *
						Math.sin(state.time * flake.swayFrequency + flake.swayPhase),
				5,
			);
		});
	});

	it("does nothing for a zero or negative delta time", () => {
		const state = createSnowfall(1440, 900, steady(0.5));
		const snapshot = JSON.parse(JSON.stringify(state.flakes)) as unknown;

		stepSnowfall(state, 0);
		stepSnowfall(state, -1);

		expect(state.flakes).toEqual(snapshot);
		expect(state.time).toBe(0);
	});

	it("recycles flakes that fall past the bottom with a fresh type roll", () => {
		const state = createSnowfall(800, 600, steady(0.5));
		const flake = state.flakes[0];
		if (!flake) throw new Error("expected at least one flake");
		flake.y = 600 + flake.radius + 1;

		// Rig the re-roll so the respawned flake binds the rarest type.
		stepSnowfall(state, 0.016, steady(0.999999));

		expect(flake.type.id).toBe("snow_geometric");
		expect(flake.y).toBeLessThan(0);
		expect(flake.age).toBe(0);
	});

	it("wraps flakes pushed past a side edge to the opposite side", () => {
		const state = createSnowfall(800, 600, steady(0.5));
		const flake = state.flakes[0];
		if (!flake) throw new Error("expected at least one flake");
		const margin = flake.radius * 4;
		flake.baseX = 800 + margin + 10;

		stepSnowfall(state, 0.016, steady(0.5));

		expect(flake.baseX).toBeLessThan(800 + margin);
		expect(flake.baseX).toBeGreaterThan(-margin * 2);
	});

	it("ramps the fade-in over the first seconds of a flake's life", () => {
		const state = createSnowfall(800, 600, steady(0.5));
		const flake = state.flakes[0];
		if (!flake) throw new Error("expected at least one flake");

		expect(getFlakeFade(flake)).toBe(0);
		flake.age = 0.6;
		expect(getFlakeFade(flake)).toBeCloseTo(0.5, 5);
		flake.age = 5;
		expect(getFlakeFade(flake)).toBe(1);
	});
});
