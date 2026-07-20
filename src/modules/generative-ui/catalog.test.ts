import type { Spec } from "@json-render/react";
import { describe, expect, it } from "vitest";
import {
	chartPropsSchema,
	comparisonChartPropsSchema,
	createGenerativeUiInstructions,
	dataTablePropsSchema,
	GENERATIVE_UI_COMPONENTS,
	generativeUiCatalog,
	priceChartPropsSchema,
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
			"PriceChart",
			"IndicatorPane",
			"PerformanceChart",
			"ComparisonChart",
			"Button",
			"Timeline",
			"MermaidDiagram",
		]);
		expect(GENERATIVE_UI_COMPONENTS).toHaveLength(14);
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
		expect(generativeUiInstructions).toContain(
			"Prefer Generative UI over Markdown",
		);
		expect(generativeUiInstructions).toContain(
			"Use Timeline for chronological events",
		);
		expect(generativeUiInstructions).toContain(
			"Use PriceChart for instrument prices",
		);
		expect(generativeUiInstructions).toContain(
			"Never calculate, interpolate, forecast, or invent chart values",
		);
		expect(generativeUiInstructions).toContain(
			"when no catalog component or composition is semantically suitable",
		);
	});

	it("advertises only renderable props and supported actions", () => {
		const generativeUiInstructions = createGenerativeUiInstructions();
		const metricLine = generativeUiInstructions
			.split("\n")
			.find((line) => line.startsWith("- Metric:"));
		const dataTableLine = generativeUiInstructions
			.split("\n")
			.find((line) => line.startsWith("- DataTable:"));

		expect(metricLine).toContain("value: string | number");
		expect(dataTableLine).toContain(
			"Record<string, string | number | boolean>",
		);
		expect(dataTableLine).not.toContain("unknown");
		expect(generativeUiInstructions).toContain("- setState:");
		expect(generativeUiInstructions).toContain("- toggleState:");
		expect(generativeUiInstructions).not.toContain("ARRAY STATE ACTIONS:");
		expect(generativeUiInstructions).not.toContain("STATE WATCHERS:");
		expect(generativeUiInstructions).not.toContain("- pushState:");
		expect(generativeUiInstructions).not.toContain("- removeState:");
		expect(generativeUiInstructions).not.toContain("- validateForm:");
	});

	it("rejects model-controlled styling and bounded data overflow", () => {
		const tooManyColumns = Array.from({ length: 11 }, (_, index) => ({
			key: `c${index}`,
			label: `Column ${index}`,
		}));

		expect(
			dataTablePropsSchema.safeParse({
				columns: [{ key: "status", label: "Status" }],
				data: [{ status: null }],
			}).success,
		).toBe(true);
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

	it("validates financial chart chronology, OHLC ranges, and normalization", () => {
		const validOhlcData = [
			{ time: "2026-07-17", open: 10, high: 12, low: 9, close: 11 },
			{ time: "2026-07-20", open: 11, high: 13, low: 10, close: 12 },
		];
		expect(
			priceChartPropsSchema.safeParse({
				symbol: "AAPL",
				style: "candlestick",
				data: validOhlcData,
			}).success,
		).toBe(true);
		expect(
			priceChartPropsSchema.safeParse({
				symbol: "AAPL",
				style: "candlestick",
				data: [...validOhlcData].reverse(),
			}).success,
		).toBe(false);
		expect(
			priceChartPropsSchema.safeParse({
				symbol: "AAPL",
				style: "candlestick",
				data: [
					{ time: "2026-07-17", open: 10, high: 9, low: 8, close: 11 },
					validOhlcData[1],
				],
			}).success,
		).toBe(false);
		expect(
			comparisonChartPropsSchema.safeParse({
				series: [
					{
						symbol: "ZERO",
						data: [
							{ time: "2026-07-17", value: 0 },
							{ time: "2026-07-20", value: 1 },
						],
					},
					{
						symbol: "AAPL",
						data: [
							{ time: "2026-07-17", value: 10 },
							{ time: "2026-07-20", value: 11 },
						],
					},
				],
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
