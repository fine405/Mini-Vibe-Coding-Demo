import {
	Mesh,
	OrthographicCamera,
	PlaneGeometry,
	Scene,
	ShaderMaterial,
	Vector2,
	WebGLRenderer,
} from "three";
import {
	createDrizzleLoopClock,
	getDrizzleVisualState,
} from "@/modules/theme/drizzleAudio";

export interface DrizzleStormSceneHandle {
	update: (dt: number, audioTime?: number | null) => void;
	renderStill: () => void;
	resize: (width: number, height: number) => void;
	dispose: () => void;
}

/** CSS-pixel rendering on Retina is enough for soft cloud fields. */
const MAX_DEVICE_PIXEL_RATIO = 1.25;

const VERTEX_SHADER = /* glsl */ `
	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = vec4(position.xy, 0.0, 1.0);
	}
`;

const FRAGMENT_SHADER = /* glsl */ `
	precision highp float;

	varying vec2 vUv;
	uniform vec2 uResolution;
	uniform float uTime;
	uniform float uThunder;
	uniform float uLightning;
	uniform float uBolt;
	uniform float uLeaderProgress;
	uniform float uLeaderStrength;
	uniform float uStrikeSeed;

	float hash21(vec2 p) {
		p = fract(p * vec2(123.34, 456.21));
		p += dot(p, p + 45.32);
		return fract(p.x * p.y);
	}

	float valueNoise(vec2 p) {
		vec2 i = floor(p);
		vec2 f = fract(p);
		f = f * f * (3.0 - 2.0 * f);
		return mix(
			mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
			mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x),
			f.y
		);
	}

	float fbm(vec2 p) {
		float value = 0.0;
		float amplitude = 0.54;
		for (int octave = 0; octave < 5; octave++) {
			value += amplitude * valueNoise(p);
			p = mat2(1.62, 1.18, -1.18, 1.62) * p + 7.13;
			amplitude *= 0.48;
		}
		return value;
	}

	float centeredNoise(vec2 p) {
		return valueNoise(p) * 2.0 - 1.0;
	}

	float dischargeOffset(float y, float seed) {
		float broad = centeredNoise(vec2(y * 2.4 + seed * 9.1, seed * 17.3));
		float bend = centeredNoise(vec2(y * 7.7 - seed * 5.4, seed * 31.7));
		float kink = centeredNoise(vec2(y * 22.6 + seed * 13.2, seed * 47.1));
		float filament = centeredNoise(vec2(y * 61.0, seed * 79.3));
		return broad * 0.075 + bend * 0.045 + kink * 0.025 + filament * 0.009;
	}

	vec3 glowLayers(float distanceToChannel, float pixelSize, float energy) {
		float core = exp(-distanceToChannel / (pixelSize * 0.85));
		float sheath = exp(-distanceToChannel / (pixelSize * 4.5));
		float corona = exp(-distanceToChannel / (pixelSize * 24.0));
		return vec3(core, sheath, corona) * energy;
	}

	vec3 dischargeField(vec2 uv, float aspect, float pixelSize) {
		float strikeX =
			0.5 + (hash21(vec2(uStrikeSeed * 19.7, uStrikeSeed + 3.1)) - 0.5) * 0.34;
		vec2 p = vec2((uv.x - strikeX) * aspect, uv.y);
		float leaderStep = floor(clamp(uLeaderProgress, 0.0, 1.0) * 11.0) / 11.0;
		float leaderFront = mix(0.985, 0.085, leaderStep);
		float leaderMask = smoothstep(
			leaderFront - pixelSize * 1.5,
			leaderFront + pixelSize * 1.5,
			uv.y
		);
		float returnFlicker =
			0.92 +
			0.08 * hash21(vec2(floor(uTime * 90.0), uStrikeSeed * 113.0));
		float channelEnergy = max(
			uLeaderStrength * leaderMask * 0.11,
			uBolt * returnFlicker
		);
		float verticalMask = smoothstep(0.055, 0.11, uv.y);
		float trunkX = dischargeOffset(uv.y, uStrikeSeed);
		vec3 field = glowLayers(abs(p.x - trunkX), pixelSize, channelEnergy);

		for (int branchIndex = 0; branchIndex < 5; branchIndex++) {
			float index = float(branchIndex);
			float branchSeed = uStrikeSeed * 71.0 + index * 19.17;
			float originY =
				0.82 -
				index * 0.135 +
				(hash21(vec2(branchSeed, 2.7)) - 0.5) * 0.065;
			float branchLength =
				0.09 + hash21(vec2(branchSeed, 8.3)) * 0.15;
			float branchT = (originY - uv.y) / branchLength;
			float branchWindow =
				smoothstep(-0.02, 0.025, branchT) *
				(1.0 - smoothstep(0.88, 1.0, branchT));
			float side =
				hash21(vec2(branchSeed, 13.1)) > 0.5 ? 1.0 : -1.0;
			float spread = 0.055 + hash21(vec2(branchSeed, 21.9)) * 0.095;
			float branchPhase = clamp(branchT, 0.0, 1.0);
			float branchWarp =
				centeredNoise(vec2(branchT * 12.0, branchSeed)) *
				0.018 *
				sin(branchPhase * 3.14159265);
			float branchX =
				dischargeOffset(originY, uStrikeSeed) +
				side * spread * (branchT + branchT * branchT * 0.32) +
				branchWarp;
			float taper = mix(0.68, 0.20, branchPhase);
			float branchEnergy = channelEnergy * branchWindow * taper;
			field = max(
				field,
				glowLayers(abs(p.x - branchX), pixelSize, branchEnergy)
			);
		}

		return field * verticalMask;
	}

	void main() {
		float aspect = uResolution.x / max(uResolution.y, 1.0);
		vec2 cloudUv = vec2(vUv.x * aspect, vUv.y);
		vec2 drift = vec2(uTime * 0.007, -uTime * 0.0014);
		float broad = fbm(cloudUv * vec2(1.8, 2.25) + drift);
		float detail = fbm(cloudUv * vec2(4.6, 5.2) - drift * 1.7 + 18.4);
		float density = smoothstep(0.43, 0.77, broad * 0.78 + detail * 0.22);
		density *= 0.34 + 0.66 * smoothstep(0.04, 0.52, vUv.y);

		float strikeX =
			0.5 + (hash21(vec2(uStrikeSeed * 19.7, uStrikeSeed + 3.1)) - 0.5) * 0.34;
		vec2 lightDelta = vec2((vUv.x - strikeX) * aspect, vUv.y - 0.67);
		float localLight = 1.0 / (1.0 + dot(lightDelta, lightDelta) * 6.5);
		float sheetLight =
			uLightning * localLight * clamp(0.10 + density * 1.18, 0.0, 1.0);
		vec3 discharge = vec3(0.0);
		if (uBolt > 0.0001 || uLeaderStrength > 0.0001) {
			discharge = dischargeField(vUv, aspect, 1.0 / uResolution.y);
		}
		float boltCore = clamp(discharge.x, 0.0, 1.0);
		float boltSheath = clamp(discharge.y, 0.0, 1.0);
		float boltCorona = clamp(discharge.z, 0.0, 1.0);

		vec3 darkCloud = vec3(0.055, 0.074, 0.100);
		vec3 litCloud = vec3(0.72, 0.84, 0.98);
		float exposure = clamp(
			sheetLight * 1.55 + boltSheath * 0.52 + boltCorona * 0.20,
			0.0,
			1.0
		);
		vec3 color = mix(darkCloud, litCloud, exposure);
		float electricLight = clamp(
			boltSheath * 0.86 + boltCorona * 0.18,
			0.0,
			1.0
		);
		color = mix(color, vec3(0.68, 0.82, 1.0), electricLight);
		color = mix(color, vec3(1.0), clamp(boltCore * 1.6, 0.0, 1.0));

		float cloudAlpha = density * (0.075 + uThunder * 0.035);
		float flashAlpha =
			sheetLight * 0.50 +
			boltCorona * 0.16 +
			boltSheath * 0.38 +
			boltCore * 0.82;
		gl_FragColor = vec4(color, clamp(cloudAlpha + flashAlpha, 0.0, 0.9));
	}
`;

const isJsdom = (): boolean =>
	typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);

export const createDrizzleStormScene = (
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
): DrizzleStormSceneHandle | null => {
	if (isJsdom()) return null;

	let renderer: WebGLRenderer;
	try {
		renderer = new WebGLRenderer({
			canvas,
			alpha: true,
			antialias: false,
			powerPreference: "high-performance",
		});
	} catch {
		return null;
	}

	renderer.setClearColor(0x000000, 0);
	renderer.setPixelRatio(
		Math.min(window.devicePixelRatio, MAX_DEVICE_PIXEL_RATIO),
	);
	renderer.setSize(width, height, false);

	const scene = new Scene();
	const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
	camera.position.z = 1;
	const geometry = new PlaneGeometry(2, 2);
	const material = new ShaderMaterial({
		transparent: true,
		depthTest: false,
		depthWrite: false,
		vertexShader: VERTEX_SHADER,
		fragmentShader: FRAGMENT_SHADER,
		uniforms: {
			uResolution: { value: new Vector2(width, height) },
			uTime: { value: 0 },
			uThunder: { value: 0 },
			uLightning: { value: 0 },
			uBolt: { value: 0 },
			uLeaderProgress: { value: 0 },
			uLeaderStrength: { value: 0 },
			uStrikeSeed: { value: 0 },
		},
	});
	const mesh = new Mesh(geometry, material);
	scene.add(mesh);

	let fallbackTimelineTime = 0;
	const audioLoopClock = createDrizzleLoopClock();

	const renderAt = (timelineTime: number) => {
		const visual = getDrizzleVisualState(timelineTime);
		material.uniforms.uTime.value = timelineTime;
		material.uniforms.uThunder.value = visual.thunder;
		material.uniforms.uLightning.value = visual.lightning;
		material.uniforms.uBolt.value = visual.bolt;
		material.uniforms.uLeaderProgress.value = visual.leaderProgress;
		material.uniforms.uLeaderStrength.value = visual.leaderStrength;
		material.uniforms.uStrikeSeed.value = visual.strikeSeed;
		renderer.render(scene, camera);
	};

	return {
		update: (dt: number, audioTime: number | null = null) => {
			fallbackTimelineTime += Math.min(0.05, Math.max(0, dt));
			const timelineTime =
				audioTime === null
					? fallbackTimelineTime
					: audioLoopClock.getTime(audioTime);
			renderAt(timelineTime);
		},
		renderStill: () => {
			material.uniforms.uTime.value = 18;
			material.uniforms.uThunder.value = 0;
			material.uniforms.uLightning.value = 0;
			material.uniforms.uBolt.value = 0;
			material.uniforms.uLeaderProgress.value = 0;
			material.uniforms.uLeaderStrength.value = 0;
			renderer.render(scene, camera);
		},
		resize: (nextWidth: number, nextHeight: number) => {
			renderer.setSize(nextWidth, nextHeight, false);
			material.uniforms.uResolution.value.set(nextWidth, nextHeight);
		},
		dispose: () => {
			scene.remove(mesh);
			geometry.dispose();
			material.dispose();
			renderer.dispose();
		},
	};
};
