import type { Spec } from "@json-render/react";
import { describe, expect, it } from "vitest";
import {
	chartPropsSchema,
	createGenerativeUiInstructions,
	dataTablePropsSchema,
	GENERATIVE_UI_COMPONENTS,
	generativeUiCatalog,
} from "@/modules/generative-ui/catalog";
import { sanitizeGenerativeSpec } from "@/modules/generative-ui/spec-policy";

describe("generative UI catalog", () => {
	it("exposes only the approved component set", () => {
		expect(generativeUiCatalog.componentNames).toEqual([
			"Stack",
			"Grid",
			"Card",
			"Text",
			"Metric",
			"DataTable",
			"Chart",
			"Button",
			"Timeline",
			"MermaidDiagram",
		]);
		expect(GENERATIVE_UI_COMPONENTS).toHaveLength(10);
	});

	it("generates an inline prompt without widening coding tasks", () => {
		const generativeUiInstructions = createGenerativeUiInstructions();

		expect(generativeUiInstructions).toContain("```spec");
		expect(generativeUiInstructions).toContain("MermaidDiagram");
		expect(generativeUiInstructions).toContain("Do not generate a UI spec");
		expect(generativeUiInstructions).toContain("Never invent research data");
		expect(generativeUiInstructions).toContain(
			"Only use setState or toggleState",
		);
	});

	it("rejects model-controlled styling and bounded data overflow", () => {
		const tooManyColumns = Array.from({ length: 11 }, (_, index) => ({
			key: `c${index}`,
			label: `Column ${index}`,
		}));

		expect(
			dataTablePropsSchema.safeParse({
				columns: [{ key: "name", label: "Name" }],
				data: [{ name: "Ada" }],
				className: "fixed inset-0",
			}).success,
		).toBe(false);
		expect(
			dataTablePropsSchema.safeParse({
				columns: tooManyColumns,
				data: [],
			}).success,
		).toBe(false);
		expect(
			chartPropsSchema.safeParse({
				type: "line",
				data: [{ month: "Jan", revenue: 10 }],
				xKey: "month",
				series: Array.from({ length: 5 }, (_, index) => ({
					key: `s${index}`,
					label: `Series ${index}`,
				})),
			}).success,
		).toBe(false);
	});
});

describe("generative UI spec policy", () => {
	it("keeps only local button actions and removes watchers", () => {
		const spec = {
			root: "button",
			state: { open: false },
			elements: {
				button: {
					type: "Button",
					props: { label: "Toggle" },
					children: [],
					on: {
						press: [
							{
								action: "toggleState",
								params: { statePath: "/open" },
								onSuccess: { navigate: "https://example.com" },
							},
							{ action: "pushState", params: { statePath: "/items" } },
						],
						change: { action: "setState", params: { statePath: "/x" } },
					},
					watch: {
						"/open": { action: "pushState", params: {} },
					},
				},
			},
		} as unknown as Spec;

		const sanitized = sanitizeGenerativeSpec(spec);
		const button = sanitized.elements.button;

		expect(button?.watch).toBeUndefined();
		expect(button?.on).toEqual({
			press: {
				action: "toggleState",
				params: { statePath: "/open" },
			},
		});
	});

	it("removes events from non-button components", () => {
		const spec = {
			root: "text",
			elements: {
				text: {
					type: "Text",
					props: { content: "Hello", variant: "body" },
					children: [],
					on: {
						press: {
							action: "setState",
							params: { statePath: "/clicked", value: true },
						},
					},
				},
			},
		} as unknown as Spec;

		expect(sanitizeGenerativeSpec(spec).elements.text?.on).toBeUndefined();
	});
});
