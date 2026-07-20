import { afterEach, describe, expect, it, vi } from "vitest";
import {
	collectRainDomSurfaces,
	collectRainDomTextSurfaces,
} from "@/modules/theme/rainDomSurfaces";

afterEach(() => {
	document.body.innerHTML = "";
	vi.restoreAllMocks();
});

describe("rain DOM surfaces", () => {
	it("collects the visible rounded target inside a registered component", () => {
		document.body.innerHTML = `
			<form data-rain-surface="agent-composer">
				<div data-slot="input-group" style="border-radius: 16px"></div>
			</form>
		`;
		const target = document.querySelector<HTMLElement>(
			"[data-slot=input-group]",
		);
		expect(target).not.toBeNull();
		vi.spyOn(target as HTMLElement, "getBoundingClientRect").mockReturnValue({
			bottom: 180,
			height: 80,
			left: 30,
			right: 330,
			top: 100,
			width: 300,
			x: 30,
			y: 100,
			toJSON: () => ({}),
		});

		expect(collectRainDomSurfaces()).toEqual([
			{
				height: 80,
				id: "agent-composer",
				radius: 16,
				width: 300,
				x: 30,
				y: 100,
			},
		]);
	});

	it("caches a text SDF while updating its screen position", () => {
		document.body.innerHTML = `
			<h2 data-rain-text-impact="subtle" data-rain-text-surface="agent-title" style="font: 600 20px sans-serif">
				Build with an agent
			</h2>
		`;
		const target = document.querySelector<HTMLElement>(
			"[data-rain-text-surface]",
		);
		expect(target).not.toBeNull();
		let left = 20;
		vi.spyOn(target as HTMLElement, "getBoundingClientRect").mockImplementation(
			() => ({
				bottom: 70,
				height: 30,
				left,
				right: left + 180,
				top: 40,
				width: 180,
				x: left,
				y: 40,
				toJSON: () => ({}),
			}),
		);
		const getImageData = vi.fn(
			(_x: number, _y: number, width: number, height: number) => {
				const data = new Uint8ClampedArray(width * height * 4);
				for (let y = 10; y < Math.min(40, height); y++) {
					for (let x = 10; x < Math.min(80, width); x++) {
						data[(y * width + x) * 4 + 3] = 255;
					}
				}
				return { data } as ImageData;
			},
		);
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
			direction: "ltr",
			fillStyle: "",
			fillText: vi.fn(),
			font: "",
			getImageData,
			letterSpacing: "0px",
			measureText: vi.fn(() => ({
				actualBoundingBoxAscent: 16,
				actualBoundingBoxDescent: 4,
			})),
			scale: vi.fn(),
			textAlign: "left",
			textBaseline: "alphabetic",
		} as unknown as CanvasRenderingContext2D);

		const first = collectRainDomTextSurfaces();
		left = 60;
		const second = collectRainDomTextSurfaces();

		expect(first).toHaveLength(1);
		expect(second).toHaveLength(1);
		expect(first[0]?.field).toBe(second[0]?.field);
		expect(second[0]?.impact).toBe("subtle");
		expect(first[0]?.x).toBe(17);
		expect(second[0]?.x).toBe(57);
		expect(getImageData).toHaveBeenCalledTimes(1);
	});
});
