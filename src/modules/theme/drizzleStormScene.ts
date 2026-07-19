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

	float segmentDistance(vec2 p, vec2 a, vec2 b) {
		vec2 pa = p - a;
		vec2 ba = b - a;
		float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
		return length(pa - ba * h);
	}

	float lightningDistance(vec2 p) {
		vec2 p0 = vec2(0.000, 0.98);
		vec2 p1 = vec2(-0.018, 0.82);
		vec2 p2 = vec2(0.012, 0.68);
		vec2 p3 = vec2(-0.010, 0.53);
		vec2 p4 = vec2(0.024, 0.37);
		vec2 p5 = vec2(0.014, 0.18);
		float d = segmentDistance(p, p0, p1);
		d = min(d, segmentDistance(p, p1, p2));
		d = min(d, segmentDistance(p, p2, p3));
		d = min(d, segmentDistance(p, p3, p4));
		d = min(d, segmentDistance(p, p4, p5));
		d = min(d, segmentDistance(p, p2, p2 + vec2(-0.10, -0.09)));
		d = min(d, segmentDistance(p, p3, p3 + vec2(0.085, -0.075)));
		return d;
	}

	void main() {
		float aspect = uResolution.x / max(uResolution.y, 1.0);
		vec2 cloudUv = vec2(vUv.x * aspect, vUv.y);
		vec2 drift = vec2(uTime * 0.007, -uTime * 0.0014);
		float broad = fbm(cloudUv * vec2(1.8, 2.25) + drift);
		float detail = fbm(cloudUv * vec2(4.6, 5.2) - drift * 1.7 + 18.4);
		float density = smoothstep(0.43, 0.77, broad * 0.78 + detail * 0.22);
		density *= 0.34 + 0.66 * smoothstep(0.04, 0.52, vUv.y);

		float strikeX = 0.52 + 0.13 * sin(uTime * 0.37 + 1.7);
		vec2 lightDelta = vec2((vUv.x - strikeX) * aspect, vUv.y - 0.67);
		float localLight = exp(-dot(lightDelta, lightDelta) * 2.6);
		float sheetLight = uLightning * localLight * (0.30 + density * 0.70);

		vec2 boltUv = vec2((vUv.x - strikeX) * aspect, vUv.y);
		float boltDistance = lightningDistance(boltUv);
		float boltCore = smoothstep(0.0032, 0.0004, boltDistance) * uBolt;
		float boltAura = exp(-boltDistance * 58.0) * uBolt;

		vec3 darkCloud = vec3(0.055, 0.074, 0.100);
		vec3 litCloud = vec3(0.72, 0.84, 0.98);
		float exposure = clamp(sheetLight * 1.45 + boltAura * 0.85, 0.0, 1.0);
		vec3 color = mix(darkCloud, litCloud, exposure);
		color = mix(color, vec3(0.94, 0.97, 1.0), boltCore);

		float cloudAlpha = density * (0.075 + uThunder * 0.035);
		float flashAlpha = sheetLight * 0.48 + boltAura * 0.24 + boltCore * 0.76;
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
