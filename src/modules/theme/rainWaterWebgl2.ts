import {
	getPendantBulbSize,
	getSurfaceRunoff,
	getSurfaceRunoffFrame,
	getSurfaceRunoffPathLength,
	getSurfaceRunoffPoint,
	getSurfaceRunoffThreshold,
	MIN_VISIBLE_SURFACE_WATER_VOLUME,
	type RainfallState,
	type SurfaceRunoffSide,
} from "@/modules/theme/rainfall";

export const WATER_ELLIPSE = 0;
export const WATER_CAPSULE = 1;
export const WATER_PENDANT = 2;
export const WATER_FILM = 3;
export const WATER_MATERIAL_BULK = 0;
export const WATER_MATERIAL_FILM = 1;

export interface RainWaterPrimitive {
	alpha: number;
	centerX: number;
	centerY: number;
	/** Half-size of the shader quad, including its antialias padding. */
	halfHeight: number;
	halfWidth: number;
	kind: 0 | 1 | 2 | 3;
	material: 0 | 1;
	params: readonly [number, number, number, number];
	rotation: number;
}

export interface RainWaterRenderer {
	dispose: () => void;
	render: (state: RainfallState) => boolean;
	resize: (width: number, height: number, dpr: number) => void;
}

const SHAPE_PADDING = 2;
const INSTANCE_FLOATS = 13;

const pushEllipse = (
	primitives: RainWaterPrimitive[],
	x: number,
	y: number,
	radiusX: number,
	radiusY: number,
	rotation: number,
	alpha: number,
	material: 0 | 1 = WATER_MATERIAL_BULK,
): void => {
	primitives.push({
		alpha,
		centerX: x,
		centerY: y,
		halfHeight: radiusY + SHAPE_PADDING,
		halfWidth: radiusX + SHAPE_PADDING,
		kind: WATER_ELLIPSE,
		material,
		params: [radiusX, radiusY, 0, 0],
		rotation,
	});
};

const pushCapsule = (
	primitives: RainWaterPrimitive[],
	start: { x: number; y: number },
	end: { x: number; y: number },
	radius: number,
	alpha: number,
	material: 0 | 1 = WATER_MATERIAL_BULK,
): void => {
	const length = Math.hypot(end.x - start.x, end.y - start.y);
	if (length <= 0.01) {
		pushEllipse(primitives, end.x, end.y, radius, radius, 0, alpha, material);
		return;
	}
	primitives.push({
		alpha,
		centerX: (start.x + end.x) * 0.5,
		centerY: (start.y + end.y) * 0.5,
		halfHeight: length * 0.5 + radius + SHAPE_PADDING,
		halfWidth: radius + SHAPE_PADDING,
		kind: WATER_CAPSULE,
		material,
		params: [radius, length * 0.5, 0, 0],
		rotation: Math.atan2(end.y - start.y, end.x - start.x) - Math.PI * 0.5,
	});
};

const pushPendant = (
	primitives: RainWaterPrimitive[],
	anchor: { x: number; y: number },
	volume: number,
	threshold: number,
	length: number,
	pinch: number,
	alpha: number,
): void => {
	const bulb = getPendantBulbSize(volume, threshold, pinch);
	const bulbOffset = Math.max(bulb.radiusY * 0.42, length);
	const top = anchor.y - SHAPE_PADDING;
	const bottom = anchor.y + bulbOffset + bulb.radiusY + SHAPE_PADDING;
	const centerY = (top + bottom) * 0.5;
	const halfHeight = (bottom - top) * 0.5;
	const neckRadius = Math.max(0.16, bulb.radiusX * (0.44 - pinch * 0.34));
	primitives.push({
		alpha,
		centerX: anchor.x,
		centerY,
		halfHeight,
		halfWidth: bulb.radiusX + SHAPE_PADDING,
		kind: WATER_PENDANT,
		material: WATER_MATERIAL_BULK,
		params: [
			anchor.y + bulbOffset - centerY,
			bulb.radiusX,
			bulb.radiusY,
			neckRadius,
		],
		rotation: 0,
	});
};

const pushFilm = (
	primitives: RainWaterPrimitive[],
	x: number,
	baselineY: number,
	halfWidth: number,
	depth: number,
	asymmetry: number,
	alpha: number,
): void => {
	primitives.push({
		alpha,
		centerX: x,
		centerY: baselineY,
		halfHeight: depth + SHAPE_PADDING,
		halfWidth: halfWidth + SHAPE_PADDING,
		kind: WATER_FILM,
		material: WATER_MATERIAL_FILM,
		params: [halfWidth, depth, asymmetry, 0],
		rotation: 0,
	});
};

const addRunoffPathPrimitives = (
	primitives: RainWaterPrimitive[],
	surface: RainfallState["surfaces"][number],
	side: SurfaceRunoffSide,
	startProgress: number,
	endProgress: number,
	radius: number,
	alpha: number,
): void => {
	let previous = getSurfaceRunoffPoint(surface, side, startProgress);
	for (let index = 1; index <= 6; index++) {
		const progress =
			startProgress + ((endProgress - startProgress) * index) / 6;
		const point = getSurfaceRunoffPoint(surface, side, progress);
		pushCapsule(
			primitives,
			previous,
			point,
			radius,
			alpha,
			WATER_MATERIAL_FILM,
		);
		previous = point;
	}
};

const addAttachedRunoffPrimitives = (
	primitives: RainWaterPrimitive[],
	surface: RainfallState["surfaces"][number],
	side: SurfaceRunoffSide,
): void => {
	const runoff = getSurfaceRunoff(surface, side);
	const threshold = getSurfaceRunoffThreshold(
		surface,
		side,
		runoff.releaseIndex,
	);
	const fill = Math.min(1.2, runoff.volume / threshold);
	const hasLiveTrail = runoff.volume > 0.02 && runoff.progress > 0;

	if (
		!hasLiveTrail &&
		runoff.residue > 0.01 &&
		runoff.residueEnd > runoff.residueStart
	) {
		addRunoffPathPrimitives(
			primitives,
			surface,
			side,
			runoff.residueStart,
			runoff.residueEnd,
			0.2 + runoff.residue * 0.08,
			0.012 + runoff.residue * 0.045,
		);
	}

	if (hasLiveTrail) {
		const pathLength = Math.max(1, getSurfaceRunoffPathLength(surface));
		const tailLength = Math.min(14, 4 + fill * 10);
		const tailProgress = Math.max(0, runoff.progress - tailLength / pathLength);
		addRunoffPathPrimitives(
			primitives,
			surface,
			side,
			tailProgress,
			runoff.progress,
			0.28 + fill * 0.32,
			0.045 + fill * 0.1,
		);

		if (runoff.progress < 1) {
			const head = getSurfaceRunoffFrame(surface, side, runoff.progress);
			pushEllipse(
				primitives,
				head.x,
				head.y,
				0.46 + fill * 0.38,
				0.62 + fill * 0.48,
				Math.atan2(head.tangentY, head.tangentX) - Math.PI * 0.5,
				0.08 + fill * 0.18,
			);
		}
	}

	if (runoff.progress < 1) return;
	const anchor = getSurfaceRunoffPoint(surface, side, 1);
	if (runoff.recoil > 0 && runoff.pendantLength > 0.05) {
		pushCapsule(
			primitives,
			anchor,
			{ x: anchor.x, y: anchor.y + runoff.pendantLength },
			0.17 + runoff.recoil * 0.2,
			0.19 * runoff.recoil,
		);
	} else if (runoff.volume > 0.01) {
		pushPendant(
			primitives,
			anchor,
			runoff.volume,
			threshold,
			runoff.pendantLength,
			runoff.pinch,
			0.14 + Math.min(1, fill) * 0.25,
		);
	}
};

/** Converts renderer-agnostic water state into a small batch of SDF shapes. */
export const buildRainWaterPrimitives = (
	state: RainfallState,
): RainWaterPrimitive[] => {
	const primitives: RainWaterPrimitive[] = [];
	for (const bead of state.surfaceBeads) {
		if (bead.volume < MIN_VISIBLE_SURFACE_WATER_VOLUME) continue;
		const surface = state.surfaces.find(
			(candidate) => candidate.id === bead.surfaceId,
		);
		if (!surface) continue;
		const radius = Math.min(surface.radius, surface.width * 0.5);
		const trackLeft = surface.x + radius;
		const trackWidth = Math.max(1, surface.width - radius * 2);
		const x = trackLeft + bead.u * trackWidth;
		const halfWidth = Math.min(13, 4 + Math.sqrt(bead.volume) * 7);
		const depth = Math.min(0.9, 0.18 + Math.sqrt(bead.volume) * 0.64);
		const asymmetry = Math.sin(bead.u * 47 + bead.volume * 3) * 0.12;
		const alpha = Math.min(0.17, 0.055 + bead.volume * 0.09);
		pushFilm(
			primitives,
			x,
			surface.y + 0.24,
			halfWidth,
			depth,
			asymmetry,
			alpha,
		);
	}
	for (const surface of state.surfaces) {
		for (const side of ["left", "right"] as const) {
			addAttachedRunoffPrimitives(primitives, surface, side);
		}
	}

	for (const drop of state.runoffDrops) {
		const speed = Math.hypot(drop.vx, drop.vy);
		const directionX = speed > 0 ? drop.vx / speed : 0;
		const directionY = speed > 0 ? drop.vy / speed : 1;
		const tailLength = Math.min(7, speed * 0.012);
		if (tailLength > 0.25) {
			pushCapsule(
				primitives,
				{
					x: drop.x - directionX * tailLength,
					y: drop.y - directionY * tailLength,
				},
				{ x: drop.x, y: drop.y },
				drop.size * 0.18,
				drop.alpha * 0.16,
			);
		}
		const stretch = 1 + Math.min(0.55, speed / 850);
		pushEllipse(
			primitives,
			drop.x,
			drop.y,
			(drop.size * drop.aspect) / Math.sqrt(stretch),
			drop.size * stretch,
			Math.atan2(drop.vy, drop.vx) - Math.PI * 0.5,
			drop.alpha,
		);
	}
	return primitives;
};

const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec2 a_center;
layout(location = 2) in vec2 a_halfSize;
layout(location = 3) in float a_rotation;
layout(location = 4) in vec4 a_style;
layout(location = 5) in vec4 a_params;

uniform vec2 u_resolution;

out vec2 v_local;
out vec2 v_halfSize;
flat out int v_kind;
flat out int v_material;
out float v_alpha;
out vec4 v_params;

void main() {
	vec2 local = a_corner * a_halfSize;
	float cosine = cos(a_rotation);
	float sine = sin(a_rotation);
	vec2 world = a_center + mat2(cosine, sine, -sine, cosine) * local;
	vec2 clip = world / u_resolution * 2.0 - 1.0;
	gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
	v_local = local;
	v_halfSize = a_halfSize;
	v_kind = int(a_style.x + 0.5);
	v_material = int(a_style.z + 0.5);
	v_alpha = a_style.y;
	v_params = a_params;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_local;
in vec2 v_halfSize;
flat in int v_kind;
flat in int v_material;
in float v_alpha;
in vec4 v_params;

out vec4 outColor;

float sdEllipse(vec2 point, vec2 radius) {
	vec2 safeRadius = max(radius, vec2(0.001));
	return (length(point / safeRadius) - 1.0) * min(safeRadius.x, safeRadius.y);
}

float sdCapsule(vec2 point, vec2 start, vec2 end, float radius) {
	vec2 segment = end - start;
	float amount = clamp(dot(point - start, segment) / max(dot(segment, segment), 0.001), 0.0, 1.0);
	return length(point - start - segment * amount) - radius;
}

float sdTaperedSegment(vec2 point, vec2 start, vec2 end, float startRadius, float endRadius) {
	vec2 segment = end - start;
	float amount = clamp(dot(point - start, segment) / max(dot(segment, segment), 0.001), 0.0, 1.0);
	float radius = mix(startRadius, endRadius, amount);
	return length(point - start - segment * amount) - radius;
}

float smoothUnion(float first, float second, float radius) {
	float amount = clamp(0.5 + 0.5 * (second - first) / radius, 0.0, 1.0);
	return mix(second, first, amount) - radius * amount * (1.0 - amount);
}

float shapeDistance(vec2 point) {
	if (v_kind == ${WATER_ELLIPSE}) {
		return sdEllipse(point, v_params.xy);
	}
	if (v_kind == ${WATER_CAPSULE}) {
		return sdCapsule(
			point,
			vec2(0.0, -v_params.y),
			vec2(0.0, v_params.y),
			v_params.x
		);
	}
	if (v_kind == ${WATER_FILM}) {
		float halfWidth = max(0.001, v_params.x);
		float normalizedX = clamp(point.x / halfWidth, -1.0, 1.0);
		float arch = max(0.0, 1.0 - normalizedX * normalizedX);
		float top = -v_params.y * arch * (0.88 + v_params.z * normalizedX);
		float bottom = v_params.y * 0.12 * arch;
		float center = (top + bottom) * 0.5;
		float halfDepth = max(0.02, (bottom - top) * 0.5);
		float vertical = abs(point.y - center) - halfDepth;
		float horizontal = (abs(point.x) - halfWidth) * 0.35;
		return max(vertical, horizontal);
	}

	float anchorY = -v_halfSize.y + ${SHAPE_PADDING.toFixed(1)};
	vec2 bulbCenter = vec2(0.0, v_params.x);
	float bulb = sdEllipse(point - bulbCenter, v_params.yz);
	float neck = sdTaperedSegment(
		point,
		vec2(0.0, anchorY),
		vec2(0.0, v_params.x - v_params.z * 0.3),
		v_params.w,
		v_params.y * 0.72
	);
	return smoothUnion(bulb, neck, 0.55);
}

void main() {
	float distanceToWater = shapeDistance(v_local);
	float antialias = max(0.45, fwidth(distanceToWater));
	float coverage = 1.0 - smoothstep(-antialias, antialias, distanceToWater);
	if (coverage <= 0.001) discard;

	vec2 gradient = vec2(dFdx(distanceToWater), dFdy(distanceToWater));
	vec2 normal = normalize(gradient + vec2(0.0001));
	float rim = 1.0 - smoothstep(0.0, 1.35, abs(distanceToWater));
	vec2 localScale = max(v_halfSize - vec2(${SHAPE_PADDING.toFixed(1)}), vec2(0.5));
	vec2 localUv = v_local / localScale;
	float directional = pow(
		max(0.0, dot(normal, normalize(vec2(-0.58, -0.82)))),
		7.0
	);
	vec2 highlightUv = (localUv - vec2(-0.28, -0.34)) * vec2(2.8, 3.4);
	float lensHighlight = exp(-dot(highlightUv, highlightUv) * 2.1);
	float film = float(v_material == ${WATER_MATERIAL_FILM});
	float glint = mix(max(directional * 0.62, lensHighlight * 0.78), directional * 0.14, film);
	float highlight = rim * mix(0.34, 0.16, film) + glint;
	vec3 water = mix(
		vec3(0.74, 0.83, 0.9),
		vec3(0.98, 1.0, 1.0),
		clamp(highlight, 0.0, 1.0)
	);
	float alpha = coverage * v_alpha * mix(
		0.68 + rim * 0.2 + glint * 0.22,
		0.58 + rim * 0.12 + directional * 0.06,
		film
	);
	alpha = min(alpha, 0.68);
	// The drawing buffer is premultiplied so translucent SDF edges composite
	// cleanly over the DOM without dark halos.
	outColor = vec4(water * alpha, alpha);
}
`;

const compileShader = (
	gl: WebGL2RenderingContext,
	type: number,
	source: string,
): WebGLShader | null => {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
};

const createProgram = (gl: WebGL2RenderingContext): WebGLProgram | null => {
	const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
	const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
	if (!vertex || !fragment) {
		if (vertex) gl.deleteShader(vertex);
		if (fragment) gl.deleteShader(fragment);
		return null;
	}
	const program = gl.createProgram();
	if (!program) {
		gl.deleteShader(vertex);
		gl.deleteShader(fragment);
		return null;
	}
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);
	gl.deleteShader(vertex);
	gl.deleteShader(fragment);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.deleteProgram(program);
		return null;
	}
	return program;
};

export const createRainWaterRenderer = (
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
	dpr: number,
): RainWaterRenderer | null => {
	const gl = canvas.getContext("webgl2", {
		alpha: true,
		antialias: true,
		premultipliedAlpha: true,
	});
	if (!gl) return null;

	const program = createProgram(gl);
	const vertexArray = gl.createVertexArray();
	const cornerBuffer = gl.createBuffer();
	const instanceBuffer = gl.createBuffer();
	if (!program || !vertexArray || !cornerBuffer || !instanceBuffer) {
		if (program) gl.deleteProgram(program);
		if (vertexArray) gl.deleteVertexArray(vertexArray);
		if (cornerBuffer) gl.deleteBuffer(cornerBuffer);
		if (instanceBuffer) gl.deleteBuffer(instanceBuffer);
		return null;
	}

	gl.bindVertexArray(vertexArray);
	gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW,
	);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
	const stride = INSTANCE_FLOATS * Float32Array.BYTES_PER_ELEMENT;
	const configureAttribute = (
		location: number,
		size: number,
		offset: number,
	) => {
		gl.enableVertexAttribArray(location);
		gl.vertexAttribPointer(
			location,
			size,
			gl.FLOAT,
			false,
			stride,
			offset * Float32Array.BYTES_PER_ELEMENT,
		);
		gl.vertexAttribDivisor(location, 1);
	};
	configureAttribute(1, 2, 0);
	configureAttribute(2, 2, 2);
	configureAttribute(3, 1, 4);
	configureAttribute(4, 4, 5);
	configureAttribute(5, 4, 9);
	gl.bindVertexArray(null);

	const resolution = gl.getUniformLocation(program, "u_resolution");
	let cssWidth = width;
	let cssHeight = height;
	let lost = false;
	let data = new Float32Array(INSTANCE_FLOATS * 64);
	const handleContextLost = (event: Event) => {
		event.preventDefault();
		lost = true;
	};
	canvas.addEventListener("webglcontextlost", handleContextLost);

	const resize = (nextWidth: number, nextHeight: number, nextDpr: number) => {
		cssWidth = nextWidth;
		cssHeight = nextHeight;
		canvas.width = Math.round(nextWidth * nextDpr);
		canvas.height = Math.round(nextHeight * nextDpr);
		gl.viewport(0, 0, canvas.width, canvas.height);
	};
	resize(width, height, dpr);

	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	// The local trail is assembled from overlapping SDF capsules. MAX keeps
	// their joins continuous instead of accumulating opacity into bright beads.
	gl.blendEquation(gl.MAX);
	gl.blendFunc(gl.ONE, gl.ONE);
	gl.clearColor(0, 0, 0, 0);

	return {
		render: (state) => {
			if (lost || gl.isContextLost()) return false;
			const primitives = buildRainWaterPrimitives(state);
			const requiredLength = primitives.length * INSTANCE_FLOATS;
			if (requiredLength > data.length) {
				let nextLength = data.length;
				while (nextLength < requiredLength) nextLength *= 2;
				data = new Float32Array(nextLength);
			}
			for (let index = 0; index < primitives.length; index++) {
				const primitive = primitives[index];
				const offset = index * INSTANCE_FLOATS;
				data[offset] = primitive.centerX;
				data[offset + 1] = primitive.centerY;
				data[offset + 2] = primitive.halfWidth;
				data[offset + 3] = primitive.halfHeight;
				data[offset + 4] = primitive.rotation;
				data[offset + 5] = primitive.kind;
				data[offset + 6] = primitive.alpha;
				data[offset + 7] = primitive.material;
				data[offset + 8] = 0;
				data.set(primitive.params, offset + 9);
			}

			gl.clear(gl.COLOR_BUFFER_BIT);
			if (primitives.length === 0) return true;
			gl.useProgram(program);
			gl.uniform2f(resolution, cssWidth, cssHeight);
			gl.bindVertexArray(vertexArray);
			gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				data.subarray(0, requiredLength),
				gl.DYNAMIC_DRAW,
			);
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, primitives.length);
			gl.bindVertexArray(null);
			return true;
		},
		resize,
		dispose: () => {
			canvas.removeEventListener("webglcontextlost", handleContextLost);
			gl.deleteBuffer(instanceBuffer);
			gl.deleteBuffer(cornerBuffer);
			gl.deleteVertexArray(vertexArray);
			gl.deleteProgram(program);
			canvas.width = 0;
			canvas.height = 0;
		},
	};
};
