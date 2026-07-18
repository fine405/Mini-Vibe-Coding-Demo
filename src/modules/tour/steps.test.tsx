import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TOUR_STEP_IDS } from "@/modules/tour/constants";
import { getTourSteps } from "@/modules/tour/steps";

describe("mode-specific tour steps", () => {
	it("targets the code workspace in code mode", () => {
		const steps = getTourSteps("code");

		expect(steps.map((step) => step.selectorId)).toContain(
			TOUR_STEP_IDS.CODE_WORKSPACE,
		);
	});

	it("replaces the hidden code step with a live preview step in preview mode", () => {
		const steps = getTourSteps("preview");
		const selectors = steps.map((step) => step.selectorId);

		expect(selectors).toContain(TOUR_STEP_IDS.PREVIEW_WORKSPACE);
		expect(selectors).not.toContain(TOUR_STEP_IDS.CODE_WORKSPACE);

		const previewStep = steps.find(
			(step) => step.selectorId === TOUR_STEP_IDS.PREVIEW_WORKSPACE,
		);
		expect(previewStep?.position).toBe("left");
		render(<>{previewStep?.content}</>);
		expect(screen.getByRole("heading", { name: "Live Preview" })).toBeVisible();
	});
});
