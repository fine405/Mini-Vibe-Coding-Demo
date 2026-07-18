/**
 * Snowflake crystal registry.
 *
 * The sixteen crystal types, their display names, and spawn weights follow
 * the product's snow crystal data table. Each simulated flake is bound to
 * one of these entries through `Snowflake.type`.
 *
 * Visual reference: https://www.shadertoy.com/view/Mdt3Df (layered parallax
 * snowfall); crystal taxonomy per the classic snow crystal morphology.
 */

export type SnowflakeBehavior =
	| "graupel" // dense pellet: fast fall, free tumble, barely sways
	| "plate" // flat plates: fluttering rock, moderate fall
	| "dendrite" // branched crystals: strong flutter, slow fall, catches wind
	| "column" // prisms: pendulum swing, slightly fast fall
	| "needle" // needle clusters: gentle swing
	| "rosette"; // bullet rosettes: medium tumble and fall

export interface SnowflakeType {
	id: string;
	/** Chinese display name from the crystal data table. */
	name: string;
	/** Relative spawn weight (probability = weight / total weight). */
	weight: number;
	behavior: SnowflakeBehavior;
}

export const SNOWFLAKE_TYPES: readonly SnowflakeType[] = [
	{ id: "snow_graupel", name: "霰晶", weight: 30000, behavior: "graupel" },
	{ id: "snow_hex_plate", name: "六角板", weight: 22000, behavior: "plate" },
	{
		id: "snow_sectored_plate",
		name: "扇区板",
		weight: 15000,
		behavior: "plate",
	},
	{
		id: "snow_hollow_column",
		name: "空心柱",
		weight: 10000,
		behavior: "column",
	},
	{
		id: "snow_stellar_plate",
		name: "星状板",
		weight: 8000,
		behavior: "plate",
	},
	{
		id: "snow_simple_dendrite",
		name: "简枝晶",
		weight: 6000,
		behavior: "dendrite",
	},
	{
		id: "snow_fern_dendrite",
		name: "蕨枝晶",
		weight: 4000,
		behavior: "dendrite",
	},
	{
		id: "snow_needle_cluster",
		name: "针晶簇",
		weight: 2500,
		behavior: "needle",
	},
	{
		id: "snow_bullet_rosette",
		name: "玫瑰晶",
		weight: 1200,
		behavior: "rosette",
	},
	{
		id: "snow_capped_column",
		name: "冠柱晶",
		weight: 650,
		behavior: "column",
	},
	{
		id: "snow_spatial_dendrite",
		name: "空间枝",
		weight: 320,
		behavior: "dendrite",
	},
	{ id: "snow_double_plate", name: "双板晶", weight: 180, behavior: "plate" },
	{
		id: "snow_twelve_branch",
		name: "十二枝",
		weight: 80,
		behavior: "dendrite",
	},
	{ id: "snow_triangular", name: "三角晶", weight: 40, behavior: "plate" },
	{ id: "snow_leaf_plate", name: "叶片晶", weight: 20, behavior: "plate" },
	{ id: "snow_geometric", name: "几何晶", weight: 10, behavior: "plate" },
] as const;

export const SNOWFLAKE_TOTAL_WEIGHT = SNOWFLAKE_TYPES.reduce(
	(total, type) => total + type.weight,
	0,
);

const CUMULATIVE_WEIGHTS: readonly number[] = (() => {
	let sum = 0;
	return SNOWFLAKE_TYPES.map((type) => {
		sum += type.weight;
		return sum;
	});
})();

/**
 * Picks a crystal type by weight. `roll` must be in [0, 1); pass
 * `Math.random()` in production and a fixed value in tests.
 */
export const pickSnowflakeType = (roll: number): SnowflakeType => {
	const target =
		Math.min(Math.max(roll, 0), 1 - Number.EPSILON) * SNOWFLAKE_TOTAL_WEIGHT;
	for (let i = 0; i < CUMULATIVE_WEIGHTS.length; i++) {
		const cumulative = CUMULATIVE_WEIGHTS[i];
		if (cumulative !== undefined && target < cumulative) {
			const type = SNOWFLAKE_TYPES[i];
			if (type) return type;
		}
	}
	const fallback = SNOWFLAKE_TYPES[0];
	if (!fallback) throw new Error("snowflake registry is empty");
	return fallback;
};
