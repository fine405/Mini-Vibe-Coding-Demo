import { describe, expect, it } from "vitest";
import {
	pickSnowflakeType,
	SNOWFLAKE_TOTAL_WEIGHT,
	SNOWFLAKE_TYPES,
} from "@/modules/theme/snowflakes";

describe("snowflake registry", () => {
	it("binds every crystal type to its id, name, and weight", () => {
		expect(SNOWFLAKE_TYPES).toHaveLength(16);
		expect(
			SNOWFLAKE_TYPES.map((type) => [type.id, type.name, type.weight]),
		).toEqual([
			["snow_graupel", "霰晶", 30000],
			["snow_hex_plate", "六角板", 22000],
			["snow_sectored_plate", "扇区板", 15000],
			["snow_hollow_column", "空心柱", 10000],
			["snow_stellar_plate", "星状板", 8000],
			["snow_simple_dendrite", "简枝晶", 6000],
			["snow_fern_dendrite", "蕨枝晶", 4000],
			["snow_needle_cluster", "针晶簇", 2500],
			["snow_bullet_rosette", "玫瑰晶", 1200],
			["snow_capped_column", "冠柱晶", 650],
			["snow_spatial_dendrite", "空间枝", 320],
			["snow_double_plate", "双板晶", 180],
			["snow_twelve_branch", "十二枝", 80],
			["snow_triangular", "三角晶", 40],
			["snow_leaf_plate", "叶片晶", 20],
			["snow_geometric", "几何晶", 10],
		]);
		expect(SNOWFLAKE_TOTAL_WEIGHT).toBe(100000);
	});

	it("selects types by weight at the cumulative boundaries", () => {
		expect(pickSnowflakeType(0).id).toBe("snow_graupel");
		expect(pickSnowflakeType(30000 / SNOWFLAKE_TOTAL_WEIGHT).id).toBe(
			"snow_hex_plate",
		);
		// The final sliver of the range belongs to the rarest crystal.
		expect(pickSnowflakeType(0.999999).id).toBe("snow_geometric");
	});

	it("keeps rare types reachable through the weighted roll", () => {
		// Triangular occupies [99930, 99970) of the cumulative 100000 range.
		expect(pickSnowflakeType(0.9995).id).toBe("snow_triangular");
	});

	it("approximates the configured probabilities over many rolls", () => {
		// Deterministic LCG so the distribution check never flakes.
		let seed = 42;
		const random = () => {
			seed = (seed * 1664525 + 1013904223) % 4294967296;
			return seed / 4294967296;
		};
		const rolls = 200000;
		const counts = new Map<string, number>();
		for (let i = 0; i < rolls; i++) {
			const type = pickSnowflakeType(random());
			counts.set(type.id, (counts.get(type.id) ?? 0) + 1);
		}
		for (const type of SNOWFLAKE_TYPES) {
			const expected = type.weight / SNOWFLAKE_TOTAL_WEIGHT;
			const actual = (counts.get(type.id) ?? 0) / rolls;
			// Relative tolerance stays meaningful even for tiny probabilities.
			expect(Math.abs(actual - expected)).toBeLessThan(
				Math.max(expected * 0.2, 0.0002),
			);
		}
	});
});
