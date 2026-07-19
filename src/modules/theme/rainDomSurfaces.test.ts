import { afterEach, describe, expect, it, vi } from "vitest";
import { collectRainDomSurfaces } from "@/modules/theme/rainDomSurfaces";

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
});
