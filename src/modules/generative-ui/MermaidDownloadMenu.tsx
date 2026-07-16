"use client";

import { mermaid } from "@streamdown/mermaid";
import { Download } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

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

function renderPngBase64(svg: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			const width = image.naturalWidth || image.width;
			const height = image.naturalHeight || image.height;
			if (!width || !height) {
				reject(new Error("Mermaid image has no dimensions"));
				return;
			}

			const canvas = document.createElement("canvas");
			const scale = 2;
			canvas.width = width * scale;
			canvas.height = height * scale;
			const context = canvas.getContext("2d");
			if (!context) {
				reject(new Error("Canvas is unavailable"));
				return;
			}

			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			resolve(canvas.toDataURL("image/png").split(",")[1] ?? "");
		};
		image.onerror = () => reject(new Error("Mermaid SVG could not be loaded"));
		image.src = `data:image/svg+xml;base64,${encodeBase64(svg)}`;
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
	const menuRef = useRef<HTMLDivElement>(null);
	const renderId = useId().replace(/[^A-Za-z0-9_-]/g, "");
	const mmd = useMemo(() => encodeBase64(code), [code]);
	const currentDownloads = prepared.code === code ? prepared : {};

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
		if (!open) return;
		const closeMenu = (event: MouseEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", closeMenu);
		return () => document.removeEventListener("mousedown", closeMenu);
	}, [open]);

	return (
		<div className="absolute top-6 right-[4.5rem] z-20" ref={menuRef}>
			<button
				aria-expanded={open}
				aria-haspopup="true"
				className="cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground"
				onClick={() => setOpen((current) => !current)}
				title="Download diagram"
				type="button"
			>
				<Download size={14} />
			</button>
			{open ? (
				<div className="absolute top-full right-0 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg">
					<DownloadForm
						data={currentDownloads.svg}
						format="SVG"
						onSubmit={() => setOpen(false)}
					/>
					<DownloadForm
						data={currentDownloads.png}
						format="PNG"
						onSubmit={() => setOpen(false)}
					/>
					<DownloadForm
						data={mmd}
						format="MMD"
						onSubmit={() => setOpen(false)}
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
}
