"use client";

import { mermaid } from "@streamdown/mermaid";
import { Download } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PNG_TARGET_LONG_EDGE = 4_096;
const PNG_MAX_LONG_EDGE = 8_192;
const PNG_MAX_PIXELS = 32 * 1_024 * 1_024;

interface PreparedDownloads {
	code?: string;
	svg?: string;
	png?: string;
	failed?: boolean;
}

function encodeBase64(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (let index = 0; index < bytes.length; index += 8_192) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 8_192));
	}
	return btoa(binary);
}

interface Dimensions {
	height: number;
	width: number;
}

function getPngDimensions(source: Dimensions): Dimensions {
	const longEdge = Math.max(source.width, source.height);
	const scale = Math.min(
		Math.max(2, PNG_TARGET_LONG_EDGE / longEdge),
		PNG_MAX_LONG_EDGE / longEdge,
		Math.sqrt(PNG_MAX_PIXELS / (source.width * source.height)),
	);
	return {
		height: Math.max(1, Math.round(source.height * scale)),
		width: Math.max(1, Math.round(source.width * scale)),
	};
}

function parseSvgLength(value: string | null): number | undefined {
	if (!value || !/^\d+(?:\.\d+)?(?:px)?$/.test(value.trim())) return;
	const parsed = Number.parseFloat(value);
	return parsed > 0 ? parsed : undefined;
}

function prepareSvgForPng(svg: string): {
	dimensions?: Dimensions;
	svg: string;
} {
	const document = new DOMParser().parseFromString(svg, "image/svg+xml");
	const root = document.documentElement;
	if (root.localName !== "svg") return { svg };

	const viewBox = root
		.getAttribute("viewBox")
		?.trim()
		.split(/[\s,]+/)
		.map(Number);
	const source =
		viewBox?.length === 4 &&
		Number.isFinite(viewBox[2]) &&
		Number.isFinite(viewBox[3]) &&
		viewBox[2] > 0 &&
		viewBox[3] > 0
			? { width: viewBox[2], height: viewBox[3] }
			: {
					width: parseSvgLength(root.getAttribute("width")),
					height: parseSvgLength(root.getAttribute("height")),
				};
	if (!source.width || !source.height) return { svg };

	const dimensions = getPngDimensions({
		width: source.width,
		height: source.height,
	});
	root.setAttribute("width", String(dimensions.width));
	root.setAttribute("height", String(dimensions.height));
	return {
		dimensions,
		svg: new XMLSerializer().serializeToString(root),
	};
}

function renderPngBase64(svg: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const prepared = prepareSvgForPng(svg);
		const image = new Image();
		image.onload = () => {
			const sourceWidth = image.naturalWidth || image.width;
			const sourceHeight = image.naturalHeight || image.height;
			if (!sourceWidth || !sourceHeight) {
				reject(new Error("Mermaid image has no dimensions"));
				return;
			}
			const dimensions =
				prepared.dimensions ??
				getPngDimensions({ width: sourceWidth, height: sourceHeight });

			const canvas = document.createElement("canvas");
			canvas.width = dimensions.width;
			canvas.height = dimensions.height;
			const context = canvas.getContext("2d");
			if (!context) {
				reject(new Error("Canvas is unavailable"));
				return;
			}

			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			resolve(canvas.toDataURL("image/png").split(",")[1] ?? "");
		};
		image.onerror = () => reject(new Error("Mermaid SVG could not be loaded"));
		image.src = `data:image/svg+xml;base64,${encodeBase64(prepared.svg)}`;
	});
}

function DownloadForm({
	data,
	format,
	onSubmit,
}: {
	data?: string;
	format: "SVG" | "PNG" | "MMD";
	onSubmit: () => void;
}) {
	return (
		<form action="/api/download" method="post" onSubmit={onSubmit}>
			<input
				name="filename"
				type="hidden"
				value={`diagram.${format.toLowerCase()}`}
			/>
			<input name="data" type="hidden" value={data ?? ""} />
			<button
				className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40 disabled:cursor-wait disabled:opacity-50"
				disabled={!data}
				title={data ? `Download diagram as ${format}` : `Preparing ${format}`}
				type="submit"
			>
				{format}
			</button>
		</form>
	);
}

export function MermaidDownloadMenu({ code }: { code: string }) {
	const [open, setOpen] = useState(false);
	const [prepared, setPrepared] = useState<PreparedDownloads>({});
	const [menuHost, setMenuHost] = useState<Element | null>(null);
	const anchorRef = useRef<HTMLSpanElement>(null);
	const menuHostRef = useRef<Element | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const renderId = useId().replace(/[^A-Za-z0-9_-]/g, "");
	const mmd = useMemo(() => encodeBase64(code), [code]);
	const currentDownloads = prepared.code === code ? prepared : {};
	const closeMenuAfterSubmit = () => {
		window.setTimeout(() => setOpen(false), 0);
	};

	useEffect(() => {
		let cancelled = false;
		void mermaid
			.getMermaid()
			.render(`mermaid-download-${renderId}`, code)
			.then(async ({ svg }) => {
				const svgData = encodeBase64(svg);
				const pngData = await renderPngBase64(svg);
				if (!cancelled) setPrepared({ code, svg: svgData, png: pngData });
			})
			.catch(() => {
				if (!cancelled) setPrepared({ code, failed: true });
			});
		return () => {
			cancelled = true;
		};
	}, [code, renderId]);

	useEffect(() => {
		const scope = anchorRef.current?.parentElement;
		if (!scope) return;
		const syncMenuHost = () => {
			const nextHost = scope.querySelector(
				'[data-streamdown="mermaid-block-actions"]',
			);
			if (menuHostRef.current === nextHost) return;
			menuHostRef.current = nextHost;
			setMenuHost(nextHost);
		};
		syncMenuHost();
		const observer = new MutationObserver(syncMenuHost);
		observer.observe(scope, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!open) return;
		const closeMenu = (event: MouseEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", closeMenu);
		return () => document.removeEventListener("mousedown", closeMenu);
	}, [open]);

	const menu = (
		<div className="relative order-first flex" ref={menuRef}>
			<button
				aria-expanded={open}
				aria-haspopup="true"
				className="cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground"
				onClick={() => setOpen((current) => !current)}
				title="Download diagram"
				type="button"
			>
				<Download size={16} />
			</button>
			{open ? (
				<div className="absolute top-full right-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg">
					<DownloadForm
						data={currentDownloads.svg}
						format="SVG"
						onSubmit={closeMenuAfterSubmit}
					/>
					<DownloadForm
						data={currentDownloads.png}
						format="PNG"
						onSubmit={closeMenuAfterSubmit}
					/>
					<DownloadForm
						data={mmd}
						format="MMD"
						onSubmit={closeMenuAfterSubmit}
					/>
					{currentDownloads.failed ? (
						<p className="px-3 py-2 text-xs text-destructive" role="alert">
							Image formats unavailable.
						</p>
					) : null}
				</div>
			) : null}
		</div>
	);

	return (
		<>
			<span aria-hidden="true" className="hidden" ref={anchorRef} />
			{menuHost ? createPortal(menu, menuHost) : null}
		</>
	);
}
