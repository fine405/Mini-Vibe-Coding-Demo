import { describe, expect, it } from "vitest";
import { SNOWFLAKE_TYPES } from "@/modules/theme/snowflakes";
import {
	buildSnowflakeGeometries,
	DOUBLE_SIDED_TYPES,
} from "@/modules/theme/snowGeometries";

describe("snow crystal geometries", () => {
	const geometries = buildSnowflakeGeometries();

	it("builds one geometry per registered crystal type", () => {
		expect(geometries.size).toBe(SNOWFLAKE_TYPES.length);
		for (const type of SNOWFLAKE_TYPES) {
			expect(geometries.has(type.id)).toBe(true);
		}
	});

	it("produces valid unit-scale geometry for every type", () => {
		for (const type of SNOWFLAKE_TYPES) {
			const geometry = geometries.get(type.id);
			if (!geometry) throw new Error(`missing geometry for ${type.id}`);
			const position = geometry.getAttribute("position");
			expect(position.count).toBeGreaterThan(0);

			geometry.computeBoundingSphere();
			const sphere = geometry.boundingSphere;
			expect(sphere).not.toBeNull();
			if (!sphere) continue;
			// Builders normalize crystals to roughly a unit bounding sphere so
			// per-flake scaling stays predictable; hollow/needle forms may
			// stretch a little beyond radius 1.
			expect(sphere.radius).toBeGreaterThan(0.4);
			expect(sphere.radius).toBeLessThanOrEqual(1.8);
			expect(Number.isFinite(sphere.radius)).toBe(true);
		}
	});

	it("only marks known types as double-sided", () => {
		for (const id of DOUBLE_SIDED_TYPES) {
			expect(SNOWFLAKE_TYPES.some((type) => type.id === id)).toBe(true);
		}
	});
});
