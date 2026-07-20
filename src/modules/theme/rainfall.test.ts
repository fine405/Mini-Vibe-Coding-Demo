import { describe, expect, it } from "vitest";
import {
	createRainfall,
	depositSurfaceWater,
	EJECT_SPEED_FRACTION,
	getCrownRadius,
	getDropCount,
	getDropFade,
	getLayerDropCounts,
	getRainWindAt,
	getSurfaceRunoffPoint,
	getSurfaceRunoffThreshold,
	MAX_SPRAY_COUNT,
	NEAR_SPLASH_CHANCE,
	RAIN_GRAVITY,
	RAIN_LAYER_CONFIG,
	RAIN_WIND_RANGE,
	RING_LIFETIME_SECONDS,
	setRainSurfaces,
	setRainTextSurfaces,
	stepRainfall,
	stepSurfaceWater,
} from "@/modules/theme/rainfall";
import {
	buildRainTextSdf,
	type RainTextImpact,
	type RainTextSurfaceGeometry,
} from "@/modules/theme/rainTextSurfaces";

const steady = (value: number) => () => value;
const sequence = (...values: number[]) => {
	let index = 0;
	return () => values[index++] ?? values.at(-1) ?? 0.5;
};

const createTextBlockSurface = (
	impact: RainTextImpact,
): RainTextSurfaceGeometry => {
	const fieldWidth = 20;
	const fieldHeight = 12;
	const alpha = new Uint8ClampedArray(fieldWidth * fieldHeight);
	for (let y = 4; y <= 7; y++) {
		for (let x = 4; x <= 15; x++) alpha[y * fieldWidth + x] = 255;
	}
	const field = buildRainTextSdf(alpha, fieldWidth, fieldHeight);
	expect(field).not.toBeNull();
	return {
		field: field as Float32Array,
		fieldHeight,
		fieldWidth,
		height: fieldHeight,
		id: "text",
		impact,
		scale: 1,
		width: fieldWidth,
		x: 80,
		y: 70,
	};
};

describe("rainfall simulation", () => {
	it("scales the drop count with viewport area within hard bounds", () => {
		expect(getDropCount(320, 480)).toBe(88);
		expect(getDropCount(1280, 720)).toBe(177);
		expect(getDropCount(8000, 4000)).toBe(360);
		const total = getDropCount(2000, 1200);
		const counts = getLayerDropCounts(total);
		expect(counts.far + counts.mid + counts.near).toBe(total);
		expect(counts.far).toBeGreaterThan(counts.mid);
		expect(counts.mid).toBeGreaterThan(counts.near);
	});

	it("keeps the foreground restrained while allowing larger rain streaks", () => {
		expect(RAIN_LAYER_CONFIG.near.share).toBeLessThanOrEqual(0.08);
		for (const config of Object.values(RAIN_LAYER_CONFIG)) {
			expect(config.streakLength[1]).toBeLessThanOrEqual(22);
		}
	});

	it("uses a faster fall speed in every depth layer", () => {
		expect(RAIN_LAYER_CONFIG.far.speed[0]).toBeGreaterThanOrEqual(210);
		expect(RAIN_LAYER_CONFIG.mid.speed[0]).toBeGreaterThanOrEqual(360);
		expect(RAIN_LAYER_CONFIG.near.speed[0]).toBeGreaterThanOrEqual(560);
	});

	it("spawns bound drops scattered across the whole viewport", () => {
		const state = createRainfall(1440, 900, steady(0.5));

		expect(state.drops.length).toBe(getDropCount(1440, 900));
		expect(state.sprays).toHaveLength(0);
		expect(state.rings).toHaveLength(0);
		expect(state.textGlints).toHaveLength(0);
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
			expect(drop.streakLength).toBeGreaterThanOrEqual(config.streakLength[0]);
			expect(drop.streakLength).toBeLessThanOrEqual(config.streakLength[1]);
			expect(drop.age).toBe(0);
		}
	});

	it("ramps the active population toward the requested rain intensity", () => {
		const state = createRainfall(1280, 720, steady(0.5), 0.2);
		expect(state.drops).toHaveLength(getDropCount(1280, 720, 0.2));

		for (let i = 0; i < 8 * 60; i++) {
			stepRainfall(state, 1 / 60, steady(0.5), {
				intensity: 0.78,
				windBoost: 1,
			});
		}

		expect(state.drops).toHaveLength(getDropCount(1280, 720, 0.78));
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
		stepRainfall(state, 0.005, steady(0));

		expect(state.rings.length).toBeGreaterThan(0);
		const ring = state.rings[0];
		expect(ring.y).toBe(100);
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

	it("stops a fast drop at a registered component and deposits water", () => {
		const state = createRainfall(240, 180, steady(0.5));
		setRainSurfaces(state, [
			{ height: 48, id: "brand", radius: 14, width: 100, x: 70, y: 70 },
		]);
		for (const candidate of state.drops) {
			candidate.x = 10;
			candidate.y = -100;
		}
		const drop = state.drops.find((candidate) => candidate.layer === "near");
		expect(drop).toBeDefined();
		if (!drop) return;
		drop.x = 120;
		drop.y = 45;
		drop.speed = 700;
		drop.turbulenceAmplitude = 0;
		drop.windSusceptibility = 0;

		stepRainfall(state, 0.05, steady(0.5));

		expect(drop.y).toBeLessThan(0);
		expect(state.rings.some((ring) => ring.y < 72)).toBe(true);
		expect(state.surfaceBeads).toHaveLength(1);
		expect(state.surfaceBeads[0]?.surfaceId).toBe("brand");
	});

	it("uses a compact glint instead of a splash ring on title glyphs", () => {
		const state = createRainfall(240, 180, steady(0.5));
		setRainTextSurfaces(state, [createTextBlockSurface("standard")]);
		for (const candidate of state.drops) {
			candidate.x = 10;
			candidate.y = -100;
		}
		const drop = state.drops.find((candidate) => candidate.layer === "near");
		expect(drop).toBeDefined();
		if (!drop) return;
		drop.x = 90.5;
		drop.y = 68;
		drop.speed = 700;
		drop.turbulenceAmplitude = 0;
		drop.windSusceptibility = 0;

		stepRainfall(state, 0.02, steady(0.5));

		expect(drop.y).toBeLessThan(0);
		expect(state.textGlints).toHaveLength(1);
		expect(state.textGlints[0]?.y).toBeGreaterThanOrEqual(73);
		expect(state.textGlints[0]?.y).toBeLessThanOrEqual(75);
		expect(state.rings).toHaveLength(0);
		expect(state.sprays).toHaveLength(0);
		expect(state.surfaceBeads).toHaveLength(0);
	});

	it("keeps body-copy collisions visually quiet", () => {
		const state = createRainfall(240, 180, steady(0.5));
		setRainTextSurfaces(state, [createTextBlockSurface("subtle")]);
		for (const candidate of state.drops) {
			candidate.x = 10;
			candidate.y = -100;
		}
		const midDrop = state.drops.find((candidate) => candidate.layer === "mid");
		const nearDrop = state.drops.find(
			(candidate) => candidate.layer === "near",
		);
		expect(midDrop).toBeDefined();
		expect(nearDrop).toBeDefined();
		if (!midDrop || !nearDrop) return;
		for (const drop of [midDrop, nearDrop]) {
			drop.x = 90.5;
			drop.speed = 700;
			drop.turbulenceAmplitude = 0;
			drop.windSusceptibility = 0;
		}
		midDrop.y = 68;
		nearDrop.y = -100;

		stepRainfall(state, 0.02, steady(0));

		expect(midDrop.y).toBeLessThan(0);
		expect(state.rings).toHaveLength(0);
		expect(state.textGlints).toHaveLength(0);
		midDrop.y = -100;
		nearDrop.y = 68;
		stepRainfall(state, 0.02, steady(0));

		expect(nearDrop.y).toBeLessThan(0);
		expect(state.textGlints).toHaveLength(0);
		expect(state.rings).toHaveLength(0);
		expect(state.sprays).toHaveLength(0);
	});

	it("carries edge water around the side to the bottom before it drips", () => {
		const state = createRainfall(240, 180, steady(0.5));
		setRainSurfaces(state, [
			{ height: 48, id: "brand", radius: 14, width: 100, x: 70, y: 70 },
		]);
		for (let index = 0; index < 4; index++) {
			depositSurfaceWater(
				state,
				{
					normalX: 0,
					normalY: -1,
					surfaceId: "brand",
					t: 0,
					x: 82,
					y: 70,
				},
				0.5,
			);
		}

		stepSurfaceWater(state, 1 / 60, steady(0.5));
		const surface = state.surfaces[0];
		expect(surface).toBeDefined();
		expect(surface?.leftRunoff.progress).toBeGreaterThan(0);
		expect(surface?.leftRunoff.progress).toBeLessThan(1);
		expect(state.runoffDrops).toHaveLength(0);

		for (let index = 0; index < 6 * 60; index++) {
			stepSurfaceWater(state, 1 / 60, steady(0.5));
			if (state.runoffDrops.length > 0) break;
		}

		expect(state.runoffDrops.length).toBeGreaterThan(0);
		expect(state.runoffDrops[0]?.x).toBeCloseTo(84, 1);
		expect(state.runoffDrops[0]?.y).toBeGreaterThan(118);
		expect(state.runoffDrops[0]?.age).toBe(0);
	});

	it("keeps pendant formation continuous with the released bulb", () => {
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
		const threshold = getSurfaceRunoffThreshold(geometry, "left");
		depositSurfaceWater(
			state,
			{
				normalX: -0.7,
				normalY: -0.7,
				surfaceId: "brand",
				t: 0,
				x: 76,
				y: 74,
			},
			threshold * 1.04,
		);

		let previousBulbY = geometry.y + geometry.height;
		let maxPendantLength = 0;
		for (let index = 0; index < 8 * 240; index++) {
			stepSurfaceWater(state, 1 / 240, steady(0.5));
			const runoff = state.surfaces[0]?.leftRunoff;
			if (runoff && state.runoffDrops.length === 0) {
				const anchor = getSurfaceRunoffPoint(geometry, "left", 1);
				previousBulbY = anchor.y + runoff.pendantLength;
				maxPendantLength = Math.max(maxPendantLength, runoff.pendantLength);
			}
			if (state.runoffDrops.length > 0) break;
		}

		const released = state.runoffDrops[0];
		expect(released).toBeDefined();
		expect(maxPendantLength).toBeGreaterThan(4);
		expect(released?.age).toBe(0);
		expect(released?.y).toBeCloseTo(previousBulbY, 0);
		expect(released?.volume).toBeCloseTo(threshold * 1.04, 5);
		expect(state.surfaces[0]?.leftRunoff.volume).toBe(0);
	});

	it("varies adhesion between sides and successive releases", () => {
		const surface = {
			height: 48,
			id: "brand",
			radius: 14,
			width: 100,
			x: 70,
			y: 70,
		};
		expect(getSurfaceRunoffThreshold(surface, "left", 0)).not.toBe(
			getSurfaceRunoffThreshold(surface, "right", 0),
		);
		expect(getSurfaceRunoffThreshold(surface, "left", 0)).not.toBe(
			getSurfaceRunoffThreshold(surface, "left", 1),
		);
	});

	it("routes an upper-corner impact directly onto the attached side flow", () => {
		const state = createRainfall(240, 180, steady(0.5));
		setRainSurfaces(state, [
			{ height: 48, id: "brand", radius: 14, width: 100, x: 70, y: 70 },
		]);
		depositSurfaceWater(
			state,
			{
				normalX: -0.7,
				normalY: -0.7,
				surfaceId: "brand",
				t: 0,
				x: 76,
				y: 74,
			},
			0.14,
		);

		expect(state.surfaceBeads).toHaveLength(0);
		expect(state.surfaces[0]?.leftRunoff.volume).toBeCloseTo(0.14);
		stepSurfaceWater(state, 1 / 60, steady(0.5));
		expect(state.surfaces[0]?.leftRunoff.progress).toBeGreaterThan(0);
	});

	it("pins a small water patch instead of marching every bead to an edge", () => {
		const state = createRainfall(240, 180, steady(0.5));
		setRainSurfaces(state, [
			{ height: 48, id: "brand", radius: 14, width: 100, x: 70, y: 70 },
		]);
		depositSurfaceWater(
			state,
			{
				normalX: 0,
				normalY: -1,
				surfaceId: "brand",
				t: 0,
				x: 120,
				y: 70,
			},
			0.08,
		);

		for (let index = 0; index < 4 * 60; index++) {
			stepSurfaceWater(state, 1 / 60, steady(0.5));
		}

		expect(state.surfaceBeads).toHaveLength(1);
		expect(state.surfaceBeads[0]?.u).toBeCloseTo(0.5, 2);
		expect(state.runoffDrops).toHaveLength(0);
	});

	it("keeps a well-fed top patch pinned without an external slope", () => {
		const state = createRainfall(240, 180, steady(0.5));
		setRainSurfaces(state, [
			{ height: 48, id: "brand", radius: 14, width: 100, x: 70, y: 70 },
		]);
		depositSurfaceWater(
			state,
			{ normalX: 0, normalY: -1, surfaceId: "brand", t: 0, x: 120, y: 70 },
			0.8,
		);

		for (let index = 0; index < 6 * 60; index++) {
			stepSurfaceWater(state, 1 / 60, steady(0.5));
		}

		const surface = state.surfaces[0];
		expect(surface).toBeDefined();
		expect(state.surfaceBeads).toHaveLength(1);
		expect(state.surfaceBeads[0]?.u).toBeCloseTo(0.5, 2);
		expect(surface?.leftRunoff.volume).toBe(0);
		expect(surface?.rightRunoff.volume).toBe(0);
		expect(state.runoffDrops).toHaveLength(0);
	});

	it("fades the local wet trace after attached runoff leaves", () => {
		const state = createRainfall(240, 180, steady(0.5));
		setRainSurfaces(state, [
			{ height: 48, id: "brand", radius: 14, width: 100, x: 70, y: 70 },
		]);
		const runoff = state.surfaces[0]?.leftRunoff;
		expect(runoff).toBeDefined();
		if (!runoff) return;
		runoff.volume = 0.4;
		runoff.progress = 0.45;

		stepSurfaceWater(state, 1 / 60, steady(0.5));

		expect(runoff.residue).toBe(1);
		expect(runoff.residueEnd).toBeGreaterThan(runoff.residueStart);
		runoff.volume = 0;
		stepSurfaceWater(state, 0.5, steady(0.5));
		expect(runoff.residue).toBeGreaterThan(0);
		expect(runoff.residue).toBeLessThan(1);
		stepSurfaceWater(state, 2, steady(0.5));
		expect(runoff.residue).toBe(0);
	});

	it("recycles side-face grazes without visible splashes or deposits", () => {
		const state = createRainfall(240, 180, steady(0.5));
		setRainSurfaces(state, [
			{ height: 48, id: "brand", radius: 14, width: 100, x: 70, y: 70 },
		]);
		for (const candidate of state.drops) {
			candidate.x = 10;
			candidate.y = -100;
		}
		const drop = state.drops.find((candidate) => candidate.layer === "near");
		expect(drop).toBeDefined();
		if (!drop) return;
		// Just inside the left face: the contact normal points sideways.
		drop.x = 72;
		drop.y = 100;
		drop.speed = 100;
		drop.turbulenceAmplitude = 0;
		drop.windSusceptibility = 0;

		stepRainfall(state, 0.01, steady(0.5));

		expect(drop.y).toBeLessThan(0);
		expect(state.rings).toHaveLength(0);
		expect(state.sprays).toHaveLength(0);
		expect(state.surfaceBeads).toHaveLength(0);
	});

	it("reserves visible bottom-edge splashes for the near layer", () => {
		expect(NEAR_SPLASH_CHANCE).toBeGreaterThanOrEqual(0.25);
		expect(NEAR_SPLASH_CHANCE).toBeLessThanOrEqual(0.35);
		const state = createRainfall(200, 100, steady(0.5));
		const farDrop = state.drops.find((drop) => drop.layer === "far");
		expect(farDrop).toBeDefined();
		if (!farDrop) return;

		farDrop.y = state.height - 1;
		stepRainfall(state, 0.01, steady(0));

		expect(state.sprays).toHaveLength(0);
		expect(state.rings).toHaveLength(0);
	});

	it("accelerates spray droplets with gravity and retires them at the ground", () => {
		const state = createRainfall(200, 100, steady(0.5));
		const drop = state.drops.find((d) => d.layer === "near");
		expect(drop).toBeDefined();
		if (!drop) return;
		drop.y = 99.5;
		drop.speed = 100;
		stepRainfall(state, 0.01, sequence(0, 0.5));

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
		stepRainfall(state, 0.01, steady(0));
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

		stepRainfall(state, 0.01, steady(0));

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
