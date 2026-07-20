import type { RainSurfaceGeometry } from "@/modules/theme/rainSurfaces";
import {
	buildRainTextSdf,
	type RainTextSurfaceGeometry,
} from "@/modules/theme/rainTextSurfaces";

const TEXT_FIELD_PADDING = 3;
const TEXT_FIELD_SCALE = 2;

interface RainTextMaskCache {
	field: Float32Array;
	fieldHeight: number;
	fieldWidth: number;
	fingerprint: string;
	height: number;
	width: number;
}

interface RainTextRun {
	height: number;
	text: string;
	x: number;
	y: number;
}

const textMaskCache = new WeakMap<HTMLElement, RainTextMaskCache>();

const parseRadius = (value: string, width: number, height: number): number => {
	const firstValue = value.split(/\s+/)[0] ?? "0";
	const numericValue = Number.parseFloat(firstValue);
	if (!Number.isFinite(numericValue)) return 0;
	if (firstValue.endsWith("%")) {
		return (Math.min(width, height) * numericValue) / 100;
	}
	return numericValue;
};

/** Collects the small, explicitly opted-in set of DOM rain colliders. */
export const collectRainDomSurfaces = (
	root: ParentNode = document,
): RainSurfaceGeometry[] => {
	const registered = root.querySelectorAll<HTMLElement>("[data-rain-surface]");
	const surfaces: RainSurfaceGeometry[] = [];

	for (const element of registered) {
		const id = element.dataset.rainSurface;
		if (!id) continue;
		const target =
			element.querySelector<HTMLElement>("[data-slot=input-group]") ?? element;
		const rect = target.getBoundingClientRect();
		if (rect.width < 2 || rect.height < 2) continue;
		const view = target.ownerDocument.defaultView;
		const style = view?.getComputedStyle(target);
		const borderRadius =
			style?.borderTopLeftRadius || style?.borderRadius || "0";

		surfaces.push({
			height: rect.height,
			id,
			radius: parseRadius(borderRadius, rect.width, rect.height),
			width: rect.width,
			x: rect.left,
			y: rect.top,
		});
	}

	return surfaces;
};

const createTextFingerprint = (
	element: HTMLElement,
	style: CSSStyleDeclaration,
	width: number,
	height: number,
	text: string,
): string =>
	[
		text,
		width,
		height,
		style.direction,
		style.font,
		style.fontFamily,
		style.fontSize,
		style.fontStretch,
		style.fontStyle,
		style.fontVariant,
		style.fontWeight,
		style.letterSpacing,
		style.lineHeight,
		style.textAlign,
		element.ownerDocument.fonts?.status ?? "unsupported",
	].join("|");

const collectTextNodes = (root: Node): Text[] => {
	const nodes: Text[] = [];
	for (const child of root.childNodes) {
		if (child.nodeType === 3) nodes.push(child as Text);
		else nodes.push(...collectTextNodes(child));
	}
	return nodes;
};

const collectTextRuns = (
	element: HTMLElement,
	elementRect: DOMRect,
): RainTextRun[] => {
	const runs: RainTextRun[] = [];
	for (const node of collectTextNodes(element)) {
		for (const match of node.data.matchAll(/\S+(?:\s+|$)/g)) {
			if (match.index === undefined) continue;
			const range = element.ownerDocument.createRange();
			range.setStart(node, match.index);
			range.setEnd(node, match.index + match[0].length);
			if (typeof range.getBoundingClientRect !== "function") return [];
			const rect = range.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) continue;
			runs.push({
				height: rect.height,
				text: match[0],
				x: rect.left - elementRect.left,
				y: rect.top - elementRect.top,
			});
		}
	}
	return runs;
};

const createTextMask = (
	element: HTMLElement,
	style: CSSStyleDeclaration,
	rect: DOMRect,
	text: string,
	fingerprint: string,
): RainTextMaskCache | null => {
	const width = rect.width + TEXT_FIELD_PADDING * 2;
	const height = rect.height + TEXT_FIELD_PADDING * 2;
	const fieldWidth = Math.ceil(width * TEXT_FIELD_SCALE);
	const fieldHeight = Math.ceil(height * TEXT_FIELD_SCALE);
	const canvas = element.ownerDocument.createElement("canvas");
	canvas.width = fieldWidth;
	canvas.height = fieldHeight;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) return null;

	context.scale(TEXT_FIELD_SCALE, TEXT_FIELD_SCALE);
	context.font =
		style.font ||
		`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
	context.direction = style.direction === "rtl" ? "rtl" : "ltr";
	context.letterSpacing = style.letterSpacing;
	context.textBaseline = "alphabetic";
	context.fillStyle = "white";

	let textX = TEXT_FIELD_PADDING;
	if (style.textAlign === "center") {
		context.textAlign = "center";
		textX += rect.width * 0.5;
	} else if (style.textAlign === "right" || style.textAlign === "end") {
		context.textAlign = "right";
		textX += rect.width;
	} else {
		context.textAlign = "left";
	}

	const metrics = context.measureText(text);
	const fontSize = Number.parseFloat(style.fontSize) || rect.height;
	const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
	const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
	const runs = collectTextRuns(element, rect);
	if (runs.length > 0) {
		context.textAlign = "left";
		for (const run of runs) {
			const baselineY =
				TEXT_FIELD_PADDING +
				run.y +
				(run.height - ascent - descent) * 0.5 +
				ascent;
			context.fillText(run.text, TEXT_FIELD_PADDING + run.x, baselineY);
		}
	} else {
		const baselineY =
			TEXT_FIELD_PADDING + (rect.height - ascent - descent) * 0.5 + ascent;
		context.fillText(text, textX, baselineY);
	}

	try {
		const rgba = context.getImageData(0, 0, fieldWidth, fieldHeight).data;
		const alpha = new Uint8ClampedArray(fieldWidth * fieldHeight);
		for (let index = 0; index < alpha.length; index++) {
			alpha[index] = rgba[index * 4 + 3];
		}
		const field = buildRainTextSdf(alpha, fieldWidth, fieldHeight);
		if (!field) return null;
		return { field, fieldHeight, fieldWidth, fingerprint, height, width };
	} catch {
		return null;
	}
};

/** Collects cached glyph-level colliders for explicitly opted-in DOM text. */
export const collectRainDomTextSurfaces = (
	root: ParentNode = document,
): RainTextSurfaceGeometry[] => {
	const registered = root.querySelectorAll<HTMLElement>(
		"[data-rain-text-surface]",
	);
	const surfaces: RainTextSurfaceGeometry[] = [];

	for (const element of registered) {
		const id = element.dataset.rainTextSurface;
		const text = element.textContent?.replace(/\s+/g, " ").trim();
		if (!id || !text) continue;
		const rect = element.getBoundingClientRect();
		if (rect.width < 2 || rect.height < 2) continue;
		const style = element.ownerDocument.defaultView?.getComputedStyle(element);
		if (!style) continue;
		const fingerprint = createTextFingerprint(
			element,
			style,
			rect.width,
			rect.height,
			text,
		);
		let mask = textMaskCache.get(element);
		if (!mask || mask.fingerprint !== fingerprint) {
			mask =
				createTextMask(element, style, rect, text, fingerprint) ?? undefined;
			if (!mask) continue;
			textMaskCache.set(element, mask);
		}

		surfaces.push({
			...mask,
			id,
			impact:
				element.dataset.rainTextImpact === "subtle" ? "subtle" : "standard",
			scale: TEXT_FIELD_SCALE,
			x: rect.left - TEXT_FIELD_PADDING,
			y: rect.top - TEXT_FIELD_PADDING,
		});
	}

	return surfaces;
};
