import type { RainSurfaceGeometry } from "@/modules/theme/rainSurfaces";

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
