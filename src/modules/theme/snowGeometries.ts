/**
 * Procedural 3D snow crystal geometries, one builder per registered type.
 *
 * Every geometry is centered at the origin, sized to fit a unit bounding
 * sphere, and oriented in its natural falling attitude: plates and dendrites
 * lie flat in the XZ plane (thin axis +Y), columns and needles lie along X.
 * Builders compose stock primitives (hex cylinders, boxes, cones, spheres)
 * merged into a single BufferGeometry, so each crystal type can be drawn as
 * one InstancedMesh. Flat shading in the material supplies the facets.
 */

import {
	BoxGeometry,
	type BufferGeometry,
	ConeGeometry,
	CylinderGeometry,
	IcosahedronGeometry,
	SphereGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const SIXTY = Math.PI / 3;

const merge = (parts: BufferGeometry[]): BufferGeometry => {
	const geometry = mergeGeometries(parts, false);
	for (const part of parts) part.dispose();
	if (!geometry) throw new Error("failed to merge snow crystal geometry");
	return geometry;
};

/** Hexagonal prism with its axis along +Y (a flat plate when squashed). */
const hexPrism = (radius: number, height: number): BufferGeometry =>
	new CylinderGeometry(radius, radius, height, 6);

/** Box radiating from the origin along +X, centered at `centerX`. */
const radialBox = (
	length: number,
	thickness: number,
	width: number,
	centerX: number,
): BufferGeometry => {
	const box = new BoxGeometry(length, thickness, width);
	box.translate(centerX, 0, 0);
	return box;
};

/** Copies `geometry` for each of six 60° fan positions around +Y. */
const fan = (geometry: BufferGeometry, tiltZ = 0): BufferGeometry[] => {
	const parts: BufferGeometry[] = [];
	for (let k = 0; k < 6; k++) {
		const copy = geometry.clone();
		if (tiltZ !== 0) copy.rotateZ(k % 2 === 0 ? tiltZ : -tiltZ);
		copy.rotateY(k * SIXTY);
		parts.push(copy);
	}
	geometry.dispose();
	return parts;
};

const buildGraupel = (): BufferGeometry => {
	// Rimed pellet: a jittered icosphere, lumpy rather than symmetric.
	const geometry = new IcosahedronGeometry(0.62, 1);
	const position = geometry.getAttribute("position");
	for (let i = 0; i < position.count; i++) {
		position.setXYZ(
			i,
			position.getX(i) + (Math.random() - 0.5) * 0.16,
			position.getY(i) + (Math.random() - 0.5) * 0.16,
			position.getZ(i) + (Math.random() - 0.5) * 0.16,
		);
	}
	position.needsUpdate = true;
	geometry.computeVertexNormals();
	return geometry;
};

const buildHexPlate = (): BufferGeometry =>
	merge([hexPrism(1, 0.08), hexPrism(0.55, 0.15)]);

const buildSectoredPlate = (): BufferGeometry => {
	const ridges: BufferGeometry[] = [];
	for (let k = 0; k < 6; k++) {
		const ridge = radialBox(0.95, 0.05, 0.07, 0.475);
		ridge.translate(0, 0.055, 0);
		ridge.rotateY(k * SIXTY);
		ridges.push(ridge);
	}
	return merge([hexPrism(1, 0.07), ...ridges]);
};

const buildStellarPlate = (): BufferGeometry => {
	const arm = merge([
		radialBox(0.5, 0.05, 0.16, 0.35),
		radialBox(0.3, 0.05, 0.34, 0.72),
	]);
	return merge([hexPrism(0.22, 0.07), ...fan(arm)]);
};

/** One dendrite branch along +X with paired side twigs in the XZ plane. */
const dendriteBranch = (
	length: number,
	twigPositions: readonly number[],
	twigLength: (index: number) => number,
	twigAngle: number,
): BufferGeometry => {
	const parts: BufferGeometry[] = [radialBox(length, 0.045, 0.06, length / 2)];
	twigPositions.forEach((x, index) => {
		const twigLen = twigLength(index);
		for (const side of [-1, 1]) {
			const twig = radialBox(twigLen, 0.035, 0.04, twigLen / 2);
			twig.rotateY(side * twigAngle);
			twig.translate(x, 0, 0);
			parts.push(twig);
		}
	});
	return merge(parts);
};

const buildSimpleDendrite = (): BufferGeometry => {
	const branch = dendriteBranch(1, [0.55, 0.8], () => 0.28, 0.96);
	return merge(fan(branch));
};

const buildFernDendrite = (): BufferGeometry => {
	const branch = dendriteBranch(
		1.05,
		[0.3, 0.5, 0.7, 0.88],
		(index) => 0.3 - index * 0.055,
		0.9,
	);
	return merge(fan(branch));
};

const buildSpatialDendrite = (): BufferGeometry => {
	// Branches leave the plane: each is twisted and lifted at a 3D angle.
	const branch = dendriteBranch(0.95, [0.5, 0.75], () => 0.24, 0.96);
	const parts: BufferGeometry[] = [];
	for (let k = 0; k < 6; k++) {
		const copy = branch.clone();
		copy.rotateX((k % 2 === 0 ? 1 : -1) * 0.5);
		copy.rotateZ((k % 3 === 0 ? 1 : -1) * 0.42);
		copy.rotateY(k * SIXTY);
		parts.push(copy);
	}
	branch.dispose();
	return merge(parts);
};

const buildTwelveBranch = (): BufferGeometry => {
	const lower = dendriteBranch(0.95, [0.5, 0.75], () => 0.24, 0.96);
	lower.translate(0, -0.025, 0);
	const upper = dendriteBranch(0.85, [0.45, 0.68], () => 0.2, 0.96);
	upper.rotateY(SIXTY / 2);
	upper.translate(0, 0.025, 0);
	return merge([lower, upper]);
};

const buildDoublePlate = (): BufferGeometry => {
	const upper = hexPrism(0.8, 0.06);
	upper.translate(0, 0.16, 0);
	const lower = hexPrism(0.72, 0.06);
	lower.rotateY(0.35);
	lower.translate(0, -0.16, 0);
	return merge([upper, lower, hexPrism(0.1, 0.32)]);
};

const buildTriangular = (): BufferGeometry =>
	merge([
		new CylinderGeometry(0.95, 0.95, 0.08, 3),
		new CylinderGeometry(0.5, 0.5, 0.15, 3),
	]);

const buildLeafPlate = (): BufferGeometry => {
	const leaf = new SphereGeometry(0.3, 8, 6);
	leaf.scale(1.55, 0.12, 0.7);
	leaf.translate(0.5, 0, 0);
	return merge([hexPrism(0.18, 0.06), ...fan(leaf)]);
};

const buildGeometric = (): BufferGeometry => {
	const arrowhead = new ConeGeometry(0.22, 0.5, 3);
	arrowhead.scale(1, 1, 0.3);
	arrowhead.rotateZ(-Math.PI / 2);
	arrowhead.translate(0.6, 0, 0);
	return merge([hexPrism(0.35, 0.07), hexPrism(0.18, 0.13), ...fan(arrowhead)]);
};

const buildNeedleCluster = (): BufferGeometry => {
	const parts: BufferGeometry[] = [];
	const tilts = [0, 0.45, -0.4, 0.9, -0.85, 1.2, -1.2];
	tilts.forEach((tilt, k) => {
		const needle = new CylinderGeometry(0.028, 0.028, 1.5, 5);
		needle.rotateZ(Math.PI / 2 + tilt * 0.35);
		needle.rotateY((k * Math.PI * 2) / tilts.length + tilt);
		parts.push(needle);
	});
	return merge(parts);
};

const buildHollowColumn = (): BufferGeometry => {
	const tube = new CylinderGeometry(0.4, 0.4, 1.5, 6, 1, true);
	tube.rotateZ(Math.PI / 2);
	const rims: BufferGeometry[] = [];
	for (const x of [-0.7, 0.7]) {
		const rim = new CylinderGeometry(0.44, 0.44, 0.1, 6, 1, true);
		rim.rotateZ(Math.PI / 2);
		rim.translate(x, 0, 0);
		rims.push(rim);
	}
	return merge([tube, ...rims]);
};

const buildCappedColumn = (): BufferGeometry => {
	const column = hexPrism(0.16, 1.05);
	column.rotateZ(Math.PI / 2);
	const caps: BufferGeometry[] = [];
	for (const x of [-0.56, 0.56]) {
		const cap = hexPrism(0.4, 0.07);
		cap.rotateZ(Math.PI / 2);
		cap.translate(x, 0, 0);
		caps.push(cap);
	}
	return merge([column, ...caps]);
};

const buildBulletRosette = (): BufferGeometry => {
	const shaft = new CylinderGeometry(0.085, 0.085, 0.62, 6);
	shaft.rotateZ(Math.PI / 2);
	shaft.translate(0.31, 0, 0);
	const tip = new ConeGeometry(0.085, 0.18, 6);
	tip.rotateZ(-Math.PI / 2);
	tip.translate(0.71, 0, 0);
	const bullet = merge([shaft, tip]);
	return merge(fan(bullet, 0.14));
};

export const buildSnowflakeGeometries = (): Map<string, BufferGeometry> =>
	new Map<string, BufferGeometry>([
		["snow_graupel", buildGraupel()],
		["snow_hex_plate", buildHexPlate()],
		["snow_sectored_plate", buildSectoredPlate()],
		["snow_hollow_column", buildHollowColumn()],
		["snow_stellar_plate", buildStellarPlate()],
		["snow_simple_dendrite", buildSimpleDendrite()],
		["snow_fern_dendrite", buildFernDendrite()],
		["snow_needle_cluster", buildNeedleCluster()],
		["snow_bullet_rosette", buildBulletRosette()],
		["snow_capped_column", buildCappedColumn()],
		["snow_spatial_dendrite", buildSpatialDendrite()],
		["snow_double_plate", buildDoublePlate()],
		["snow_twelve_branch", buildTwelveBranch()],
		["snow_triangular", buildTriangular()],
		["snow_leaf_plate", buildLeafPlate()],
		["snow_geometric", buildGeometric()],
	]);

/** Hollow crystals need their inner walls drawn. */
export const DOUBLE_SIDED_TYPES: ReadonlySet<string> = new Set([
	"snow_hollow_column",
]);
