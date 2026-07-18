/**
 * three.js runtime for the Snow theme.
 *
 * This module is the only place that imports three at runtime; the React
 * component loads it with a dynamic `import()` so the WebGL bundle is only
 * fetched when the Snow theme is actually activated. The simulation state
 * (snowfall3d.ts) is renderer-agnostic; this scene maps each flake into a
 * perspective volume where depth drives scale, fog fade, and parallax.
 */

import {
	Color,
	DirectionalLight,
	DoubleSide,
	DynamicDrawUsage,
	Euler,
	Fog,
	FrontSide,
	HemisphereLight,
	InstancedMesh,
	Matrix4,
	MeshStandardMaterial,
	PerspectiveCamera,
	Quaternion,
	Scene,
	Vector3,
	WebGLRenderer,
} from "three";
import {
	createSnowfall,
	getFlakeFade,
	MAX_FLAKE_COUNT,
	type SnowfallState,
	type Snowflake,
	stepSnowfall,
} from "@/modules/theme/snowfall3d";
import { SNOWFLAKE_TYPES } from "@/modules/theme/snowflakes";
import {
	buildSnowflakeGeometries,
	DOUBLE_SIDED_TYPES,
} from "@/modules/theme/snowGeometries";

/** Haze color flakes blend into with depth; matches the snow theme tokens. */
export const SNOW_HAZE_COLOR = "#aec2d6";

const CAMERA_DISTANCE = 50;
const CAMERA_FOV = 55;
const MAX_DEPTH = 42;

const LAYER_TINTS: Record<Snowflake["layer"], Color> = {
	far: new Color("#c9d9e8"),
	mid: new Color("#e9f1f8"),
	near: new Color("#ffffff"),
};

export interface SnowSceneHandle {
	/** Advances the simulation and renders a frame. */
	update: (dt: number) => void;
	/** Renders a single static frame (prefers-reduced-motion). */
	renderStill: () => void;
	resize: (width: number, height: number) => void;
	dispose: () => void;
}

const isJsdom = (): boolean =>
	typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);

export const createSnowScene = (
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
): SnowSceneHandle | null => {
	// jsdom has no WebGL: bail quietly so tests can mount the component.
	if (isJsdom()) return null;

	let renderer: WebGLRenderer;
	try {
		renderer = new WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
		});
	} catch {
		return null;
	}

	renderer.setClearColor(0x000000, 0);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setSize(width, height, false);

	const scene = new Scene();
	scene.fog = new Fog(new Color(SNOW_HAZE_COLOR), 55, 95);

	const camera = new PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 200);
	camera.position.z = CAMERA_DISTANCE;

	const hemisphere = new HemisphereLight(0xeaf4ff, 0x8ea6bd, 1.15);
	const keyLight = new DirectionalLight(0xffffff, 1.5);
	keyLight.position.set(30, 40, 60);
	const rimLight = new DirectionalLight(0xbfd8ff, 0.55);
	rimLight.position.set(-40, -20, 30);
	scene.add(hemisphere, keyLight, rimLight);

	let state: SnowfallState = createSnowfall(width, height);

	const geometries = buildSnowflakeGeometries();
	const baseMaterial = new MeshStandardMaterial({
		color: 0xffffff,
		roughness: 0.38,
		metalness: 0.05,
		transparent: true,
		opacity: 0.94,
		flatShading: true,
	});

	const meshes = SNOWFLAKE_TYPES.map((type) => {
		const geometry = geometries.get(type.id);
		if (!geometry) throw new Error(`missing geometry for ${type.id}`);
		const material = baseMaterial.clone();
		material.side = DOUBLE_SIDED_TYPES.has(type.id) ? DoubleSide : FrontSide;
		// Capacity covers the flake-count cap so resizing the viewport up
		// never outgrows the allocated instance buffers.
		const mesh = new InstancedMesh(geometry, material, MAX_FLAKE_COUNT);
		mesh.instanceMatrix.setUsage(DynamicDrawUsage);
		mesh.frustumCulled = false;
		mesh.count = 0;
		scene.add(mesh);
		return mesh;
	});

	const typeIndexById = new Map(
		SNOWFLAKE_TYPES.map((type, index) => [type.id, index] as const),
	);

	// Scratch objects for per-instance composition.
	const matrix = new Matrix4();
	const position = new Vector3();
	const quaternion = new Quaternion();
	const scale = new Vector3();
	const euler = new Euler();
	const tint = new Color();
	const cursors = new Array<number>(meshes.length).fill(0);

	const worldPerPixel = () =>
		(2 * CAMERA_DISTANCE * Math.tan((CAMERA_FOV * Math.PI) / 360)) /
		state.height;

	const writeInstances = (): void => {
		cursors.fill(0);
		const upp = worldPerPixel();

		for (const flake of state.flakes) {
			const typeIndex = typeIndexById.get(flake.type.id);
			if (typeIndex === undefined) continue;
			const mesh = meshes[typeIndex];
			if (!mesh) continue;
			const slot = cursors[typeIndex];
			if (slot === undefined || slot >= MAX_FLAKE_COUNT) continue;

			// Perspective factor: distant flakes shrink and converge toward the
			// vanishing point, which yields natural depth parallax.
			const depth = CAMERA_DISTANCE / (CAMERA_DISTANCE + flake.z * MAX_DEPTH);
			const worldRadius = flake.radius * upp * depth;
			position.set(
				(flake.x - state.width / 2) * upp * depth,
				-(flake.y - state.height / 2) * upp * depth,
				-flake.z * MAX_DEPTH,
			);

			const rock =
				flake.rockAmplitude *
				Math.sin(state.time * flake.rockFrequency + flake.rockPhase);
			const sway =
				flake.rockAmplitude *
				0.6 *
				Math.sin(
					state.time * flake.rockFrequency * 0.83 + flake.rockPhase * 1.3,
				);
			switch (flake.type.behavior) {
				case "graupel":
					euler.set(
						flake.tumbleAngle,
						flake.tumbleAngle * 0.83,
						flake.tumbleAngle * 1.13,
					);
					break;
				case "rosette":
					euler.set(flake.tumbleAngle, flake.spinAngle + rock, sway);
					break;
				case "column":
				case "needle":
					// Prisms fall horizontally, rolling slowly and swinging like a
					// pendulum around their long axis.
					euler.set(flake.spinAngle, sway, rock);
					break;
				default:
					// Plates and dendrites fall flat, fluttering around level.
					euler.set(rock, flake.spinAngle, sway, "YXZ");
			}
			quaternion.setFromEuler(euler);

			const fade = getFlakeFade(flake);
			const scaleValue = worldRadius * (0.5 + 0.5 * fade);
			scale.setScalar(scaleValue);
			matrix.compose(position, quaternion, scale);
			mesh.setMatrixAt(slot, matrix);

			// Depth tint + fade-in; slight per-flake variation from its phase.
			const variation = 0.92 + 0.08 * (flake.swayPhase / (Math.PI * 2));
			tint.copy(LAYER_TINTS[flake.layer]).multiplyScalar(fade * variation);
			mesh.setColorAt(slot, tint);

			cursors[typeIndex] = slot + 1;
		}

		meshes.forEach((mesh, index) => {
			mesh.count = cursors[index] ?? 0;
			mesh.instanceMatrix.needsUpdate = true;
			if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		});
	};

	const render = (): void => {
		writeInstances();
		renderer.render(scene, camera);
	};

	return {
		update: (dt: number) => {
			// Clamp long frames (background tab) so flakes never teleport.
			stepSnowfall(state, Math.min(dt, 0.05));
			render();
		},
		renderStill: () => {
			// Freeze at a scattered initial state with full fade-in.
			for (const flake of state.flakes) flake.age = 2;
			render();
		},
		resize: (nextWidth: number, nextHeight: number) => {
			renderer.setSize(nextWidth, nextHeight, false);
			camera.aspect = nextWidth / nextHeight;
			camera.updateProjectionMatrix();
			state = createSnowfall(nextWidth, nextHeight);
		},
		dispose: () => {
			for (const mesh of meshes) {
				scene.remove(mesh);
				mesh.dispose();
				mesh.geometry.dispose();
				if (Array.isArray(mesh.material)) {
					for (const material of mesh.material) material.dispose();
				} else {
					mesh.material.dispose();
				}
			}
			baseMaterial.dispose();
			renderer.dispose();
		},
	};
};
