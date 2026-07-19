import { describe, expect, it } from "vitest";
import {
	createRainfall,
	EJECT_SPEED_FRACTION,
	getCrownRadius,
	getDropCount,
	getDropFade,
	getLayerDropCounts,
	getRainWindAt,
	MAX_SPRAY_COUNT,
	RAIN_GRAVITY,
	RAIN_LAYER_CONFIG,
	RAIN_WIND_RANGE,
	RING_LIFETIME_SECONDS,
	stepRainfall,
} from "@/modules/theme/rainfall";

const steady = (value: number) => () => value;

describe("rainfall simulation", () => {
	it("scales the drop count with viewport area within hard bounds", () => {
		expect(getDropCount(320, 480)).toBe(240);
		expect(getDropCount(8000, 4000)).toBe(640);
		const total = getDropCount(2000, 1200);
		const counts = getLayerDropCounts(total);
		expect(counts.far + counts.mid + counts.near).toBe(total);
		expect(counts.far).toBeGreaterThan(counts.mid);
		expect(counts.mid).toBeGreaterThan(counts.near);
	});

	it("spawns bound drops scattered across the whole viewport", () => {
		const state = createRainfall(1440, 900, steady(0.5));

		expect(state.drops.length).toBe(getDropCount(1440, 900));
		expect(state.sprays).toHaveLength(0);
		expect(state.rings).toHaveLength(0);
		for (const drop of state.drops) {
			const config = RAIN_LAYER_CONFIG[drop.layer];
			expect(drop.y).toBeGreaterThanOrEqual(0);
			expect(drop.y).toBeLessThanOrEqual(900);
			expect(drop.x).toBeGreaterThanOrEqual(0);
			expect(drop.x).toBeLessThanOrEqual(1440);
			expect(drop.speed).toBeGreaterThanOrEqual(config.speed[0]);
			expect(drop.speed).toBeLessThanOrEqual(config.speed[1]);
			expect(drop.alpha).toBeGreaterThanOrEqual(config.alpha[0]);
			expect(drop.alpha).toBeLessThanOrEqual(config.alpha[1]);
			expect(drop.age).toBe(0);
		}
	});

	it("keeps the gusting wind inside its published range", () => {
		for (let t = 0; t < 2000; t += 0.37) {
			const wind = getRainWindAt(t);
			expect(wind).toBeGreaterThanOrEqual(RAIN_WIND_RANGE[0] - 1e-6);
			expect(wind).toBeLessThanOrEqual(RAIN_WIND_RANGE[1] + 1e-6);
		}
	});

	it("moves drops down at terminal velocity and drifts them sideways", () => {
		const state = createRainfall(1440, 900, steady(0.5));
		const before = state.drops.map((drop) => ({ x: drop.x, y: drop.y }));

		stepRainfall(state, 0.5, steady(0.5));

		state.drops.forEach((drop, index) => {
			const start = before[index];
			expect(start).toBeDefined();
			if (!start) return;
			expect(drop.y).toBeCloseTo(start.y + drop.speed * 0.5, 5);
			// Wind plus turbulence always produces a horizontal velocity.
			expect(drop.vx).not.toBe(0);
			expect(drop.x).toBeCloseTo(start.x + drop.vx * 0.5, 5);
		});
	});

	it("does nothing for a zero or negative delta time", () => {
		const state = createRainfall(1440, 900, steady(0.5));
		stepRainfall(state, 0, steady(0.5));
		expect(state.time).toBe(0);
		stepRainfall(state, -1, steady(0.5));
		expect(state.time).toBe(0);
	});

	it("splashes on the bottom edge and recycles the drop above the top", () => {
		const state = createRainfall(200, 100, steady(0.5));
		const drop = state.drops.find((d) => d.layer === "near");
		expect(drop).toBeDefined();
		if (!drop) return;
		drop.y = 99.5;
		drop.speed = 100;

		// Small enough dt that freshly ejected spray is still moving up.
		stepRainfall(state, 0.005, steady(0.5));

		expect(state.rings.length).toBeGreaterThan(0);
		const ring = state.rings[0];
		expect(ring.groundY).toBe(100);
		expect(Number.isFinite(ring.x)).toBe(true);
		expect(ring.lifetime).toBe(RING_LIFETIME_SECONDS);

		expect(state.sprays.length).toBeGreaterThan(0);
		for (const spray of state.sprays) {
			// Ejected upward at a fraction of the impact speed.
			expect(spray.vy).toBeLessThan(0);
			expect(Math.abs(spray.vy)).toBeLessThanOrEqual(
				100 * EJECT_SPEED_FRACTION[1] + 1e-6,
			);
			expect(spray.lifetime).toBeLessThanOrEqual(0.5);
		}

		// Recycled above the top edge with a fresh age.
		expect(drop.y).toBeLessThan(0);
		expect(drop.age).toBe(0);
	});

	it("accelerates spray droplets with gravity and retires them at the ground", () => {
		const state = createRainfall(200, 100, steady(0.5));
		const drop = state.drops.find((d) => d.layer === "near");
		expect(drop).toBeDefined();
		if (!drop) return;
		drop.y = 99.5;
		drop.speed = 100;
		stepRainfall(state, 0.01, steady(0.5));

		const spray = state.sprays[0];
		expect(spray).toBeDefined();
		const vyBefore = spray.vy;

		// One step: purely ballistic, gravity adds exactly g * dt to vy.
		stepRainfall(state, 0.005, steady(0.5));
		expect(state.sprays).toContain(spray);
		expect(spray.vy).toBeCloseTo(vyBefore + RAIN_GRAVITY * 0.005, 5);

		const steps = Math.ceil((spray.lifetime + 0.05) / 0.01);
		let retired = false;
		for (let i = 0; i < steps; i++) {
			stepRainfall(state, 0.01, steady(0.5));
			if (!state.sprays.includes(spray)) {
				retired = true;
				break;
			}
		}
		expect(retired).toBe(true);
	});

	it("expires crown rings after their short lifetime", () => {
		const state = createRainfall(200, 100, steady(0.5));
		const drop = state.drops.find((d) => d.layer === "near");
		expect(drop).toBeDefined();
		if (!drop) return;
		drop.y = 99.5;
		drop.speed = 100;
		stepRainfall(state, 0.01, steady(0.5));
		expect(state.rings.length).toBeGreaterThan(0);

		// Park every drop far above the ground so no new splashes appear.
		for (const d of state.drops) d.y = -100;
		state.sprays = [];
		stepRainfall(state, RING_LIFETIME_SECONDS + 0.01, steady(0.5));
		expect(state.rings).toHaveLength(0);
	});

	it("caps live spray droplets when many drops impact at once", () => {
		const state = createRainfall(1440, 900, steady(0.5));
		for (const drop of state.drops) drop.y = state.height - 1;

		stepRainfall(state, 0.01, steady(0.5));

		expect(state.sprays.length).toBeLessThanOrEqual(MAX_SPRAY_COUNT);
		expect(state.sprays.length).toBeGreaterThan(0);
	});

	it("grows the crown radius with impact speed", () => {
		expect(getCrownRadius(200)).toBeLessThan(getCrownRadius(400));
		expect(getCrownRadius(400)).toBeLessThan(getCrownRadius(620));
		expect(getCrownRadius(620)).toBeLessThanOrEqual(5);
	});

	it("ramps the drop fade-in over the first moments of life", () => {
		const state = createRainfall(1440, 900, steady(0.5));
		const drop = state.drops[0];
		expect(getDropFade(drop)).toBe(0);
		drop.age = 0.2;
		expect(getDropFade(drop)).toBeCloseTo(0.5, 5);
		drop.age = 1;
		expect(getDropFade(drop)).toBe(1);
	});
});
