import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

const shortText = z.string().max(200);
const primitiveCell = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const dataKey = z.string().min(1).max(64);

export const stackPropsSchema = z
	.object({
		direction: z.enum(["vertical", "horizontal"]).optional(),
		gap: z.enum(["sm", "md", "lg"]).optional(),
		align: z.enum(["start", "center", "end", "stretch"]).optional(),
	})
	.strict();

export const gridPropsSchema = z
	.object({
		columns: z.number().int().min(1).max(4).optional(),
		gap: z.enum(["sm", "md", "lg"]).optional(),
	})
	.strict();

export const cardPropsSchema = z
	.object({
		title: shortText.optional(),
		description: z.string().max(1_000).optional(),
		tone: z
			.enum(["neutral", "info", "success", "warning", "danger"])
			.optional(),
	})
	.strict();

export const textPropsSchema = z
	.object({
		content: z.string().max(8_000),
		variant: z.enum(["title", "heading", "body", "caption", "code"]).optional(),
		tone: z
			.enum(["default", "muted", "success", "warning", "danger"])
			.optional(),
	})
	.strict();

export const metricPropsSchema = z
	.object({
		label: shortText,
		value: shortText,
		detail: z.string().max(500).optional(),
		trend: z.enum(["up", "down", "neutral"]).optional(),
	})
	.strict();

export const dataTablePropsSchema = z
	.object({
		columns: z
			.array(
				z
					.object({
						key: dataKey,
						label: shortText,
						align: z.enum(["left", "center", "right"]).optional(),
					})
					.strict(),
			)
			.min(1)
			.max(10),
		data: z.array(z.record(z.string().max(64), primitiveCell)).max(100),
		emptyText: shortText.optional(),
	})
	.strict();

export const chartPropsSchema = z
	.object({
		type: z.enum(["bar", "line"]),
		data: z
			.array(z.record(z.string().max(64), z.union([z.string(), z.number()])))
			.min(1)
			.max(100),
		xKey: dataKey,
		series: z
			.array(
				z
					.object({
						key: dataKey,
						label: shortText,
					})
					.strict(),
			)
			.min(1)
			.max(4),
	})
	.strict();

export const buttonPropsSchema = z
	.object({
		label: shortText,
		variant: z.enum(["primary", "secondary", "outline", "danger"]).optional(),
		disabled: z.boolean().optional(),
	})
	.strict();

export const timelinePropsSchema = z
	.object({
		items: z
			.array(
				z
					.object({
						title: shortText,
						description: z.string().max(1_000).optional(),
						time: shortText.optional(),
						status: z
							.enum(["completed", "current", "upcoming", "failed"])
							.optional(),
					})
					.strict(),
			)
			.min(1)
			.max(30),
	})
	.strict();

export const mermaidDiagramPropsSchema = z
	.object({
		title: shortText.optional(),
		code: z
			.string()
			.min(1)
			.max(20 * 1024),
	})
	.strict();

export const toggleStateParamsSchema = z
	.object({
		statePath: z.string().min(1).max(256).startsWith("/"),
	})
	.strict();

export const GENERATIVE_UI_COMPONENTS = [
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
] as const;

export const generativeUiCatalog = defineCatalog(schema, {
	components: {
		Stack: {
			props: stackPropsSchema,
			slots: ["default"],
			description: "Flex layout for vertical or horizontal content groups.",
			example: { direction: "vertical", gap: "md", align: "stretch" },
		},
		Grid: {
			props: gridPropsSchema,
			slots: ["default"],
			description: "Responsive 1-4 column grid for comparisons and metrics.",
			example: { columns: 3, gap: "md" },
		},
		Card: {
			props: cardPropsSchema,
			slots: ["default"],
			description:
				"A themed content group with optional title and semantic tone.",
			example: { title: "Overview", tone: "neutral" },
		},
		Text: {
			props: textPropsSchema,
			slots: [],
			description: "Plain text with a constrained typography variant and tone.",
			example: { content: "Summary", variant: "heading" },
		},
		Metric: {
			props: metricPropsSchema,
			slots: [],
			description: "A key value, label, optional detail and trend indicator.",
			example: { label: "Tests", value: "128", trend: "up" },
		},
		DataTable: {
			props: dataTablePropsSchema,
			slots: [],
			description:
				"A bounded semantic table for up to 100 rows and 10 columns.",
			example: {
				columns: [
					{ key: "name", label: "Name" },
					{ key: "value", label: "Value", align: "right" },
				],
				data: [{ name: "Build", value: "Passed" }],
			},
		},
		Chart: {
			props: chartPropsSchema,
			slots: [],
			description:
				"A bounded bar or line chart with up to four numeric series.",
			example: {
				type: "line",
				data: [
					{ month: "Jan", value: 10 },
					{ month: "Feb", value: 14 },
				],
				xKey: "month",
				series: [{ key: "value", label: "Value" }],
			},
		},
		Button: {
			props: buttonPropsSchema,
			slots: [],
			events: ["press"],
			description:
				"A local-only button. Bind on.press to setState or toggleState.",
			example: { label: "Show details", variant: "outline" },
		},
		Timeline: {
			props: timelinePropsSchema,
			slots: [],
			description:
				"A vertical sequence of up to 30 milestones or process steps.",
			example: {
				items: [
					{ title: "Inspect", status: "completed" },
					{ title: "Implement", status: "current" },
				],
			},
		},
		MermaidDiagram: {
			props: mermaidDiagramPropsSchema,
			slots: [],
			description:
				"A strict Mermaid flowchart, sequence, state, class or ER diagram. Use plain-text labels and omit style, classDef, linkStyle, HTML, links, and callbacks.",
			example: { code: "flowchart LR\n  A[Request] --> B[Response]" },
		},
	},
	actions: {
		toggleState: {
			params: toggleStateParamsSchema,
			description:
				"Toggle one boolean value at a local JSON Pointer statePath.",
		},
	},
});

export function createGenerativeUiInstructions(): string {
	return generativeUiCatalog.prompt({
		mode: "inline",
		customRules: [
			"Prefer Generative UI over Markdown for a read-only explanation or research result whenever a catalog component or composition is semantically suitable and materially improves the presentation.",
			"Do not generate a UI spec for workspace mutation tasks; use the existing tools, finalize_changes review, and Sandpack preview instead.",
			"Choose the most specific semantic catalog component instead of a generic diagram.",
			"Use Timeline for chronological events, milestones, schedules, and ordered process steps; use Chart for bar or line data; use DataTable for tabular data.",
			"Use MermaidDiagram only for flow, sequence, state, class, or ER relationships that are not better represented by another catalog component. Do not substitute MermaidDiagram for Timeline.",
			"Fall back to Markdown, including Mermaid code blocks, when no catalog component or composition is semantically suitable or Generative UI would not materially improve the presentation.",
			"Use only facts and data supplied by the user or returned by tools. Never invent research data to fill a component.",
			"Only use setState or toggleState for Button on.press actions. Never use pushState, removeState, validateForm, watch, navigation, fetch, or external actions.",
			"Do not use className, style, raw HTML, JavaScript, formatter functions, remote images, or external links.",
			"Keep generated interfaces compact enough to fit inside a chat message.",
		],
	});
}
