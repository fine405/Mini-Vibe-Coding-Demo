import {
	ActivityIcon,
	BarChart3Icon,
	GitBranchIcon,
	ListChecksIcon,
	type LucideIcon,
	PlusIcon,
	SearchIcon,
	SparklesIcon,
	TablePropertiesIcon,
	WorkflowIcon,
	WrenchIcon,
} from "lucide-react";

export type SuggestionTab = "starter" | "generative-ui";

export interface ChatSuggestion {
	id: string;
	label: string;
	description: string;
	prompt: string;
	icon: LucideIcon;
}

export const STARTER_SUGGESTIONS: ChatSuggestion[] = [
	{
		id: "review-ux",
		label: "Review the current app",
		description: "Find focused UX improvements",
		prompt: "Review the current app and improve its UX",
		icon: SearchIcon,
	},
	{
		id: "add-feature",
		label: "Add a useful feature",
		description: "Inspect the project and extend it",
		prompt: "Add a useful feature to this project",
		icon: PlusIcon,
	},
	{
		id: "fix-problems",
		label: "Find and fix problems",
		description: "Diagnose the codebase first",
		prompt: "Find and fix problems in the codebase",
		icon: WrenchIcon,
	},
	{
		id: "improve-accessibility",
		label: "Improve accessibility",
		description: "Audit the main user flow",
		prompt:
			"Audit the current app's main user flow for accessibility issues and implement the highest-impact fixes",
		icon: SparklesIcon,
	},
	{
		id: "add-tests",
		label: "Strengthen test coverage",
		description: "Cover the riskiest behavior",
		prompt:
			"Inspect the current test coverage and add focused tests for the highest-risk untested behavior",
		icon: ListChecksIcon,
	},
	{
		id: "simplify-architecture",
		label: "Simplify one deep module",
		description: "Reduce complexity without a rewrite",
		prompt:
			"Find one unnecessarily complicated module, explain the problem, and implement the smallest safe simplification",
		icon: GitBranchIcon,
	},
];

export const GENERATIVE_UI_SUGGESTIONS: ChatSuggestion[] = [
	{
		id: "project-health-dashboard",
		label: "Project health dashboard",
		description: "Grid · Metric · Table · Bar chart",
		prompt: [
			"This is a read-only explanation. Do not modify the workspace.",
			"Create a compact project health dashboard using Generative UI. Use only this data: Build 92, Tests 87, UX 76; modules Editor=ready, Preview=ready, Chat=review; weekly score Mon=68, Tue=74, Wed=81, Thu=87.",
			"Compose Stack, Grid, Card, Metric, DataTable, and a bar Chart. Start with one short text summary and do not invent additional facts.",
		].join("\n"),
		icon: BarChart3Icon,
	},
	{
		id: "release-readiness",
		label: "Interactive release plan",
		description: "Timeline · Line chart · Local button",
		prompt: [
			"This is a read-only explanation. Do not modify the workspace.",
			"Build a compact release readiness interface using only this data: readiness Mon=62, Tue=71, Wed=79, Thu=88; Inspect=completed, Implement=completed, Verify=current, Release=upcoming.",
			"Compose Stack, Card, Text, a line Chart, Timeline, and a Button whose toggleState action shows or hides a Text detail saying: Release requires verification sign-off. Do not invent additional facts.",
		].join("\n"),
		icon: ListChecksIcon,
	},
	{
		id: "agent-architecture",
		label: "Agent architecture diagram",
		description: "Mermaid · Card · Text",
		prompt: [
			"This is a read-only explanation. Do not modify the workspace.",
			"Create a Generative UI architecture explanation for exactly this flow: User Request -> Mastra Agent -> AI SDK UIMessage Stream -> pipeJsonRender -> data-spec parts -> Safe React Registry.",
			"Use MermaidDiagram as the primary flowchart, with a Card and concise Text legend. Do not add systems, links, callbacks, HTML, or facts that were not supplied.",
		].join("\n"),
		icon: WorkflowIcon,
	},
	{
		id: "product-comparison",
		label: "Product comparison board",
		description: "Cards · Metrics · Comparison table",
		prompt: [
			"This is a read-only comparison. Do not modify the workspace.",
			"Create a compact Generative UI comparison using only these scores: json-render safety=9, flexibility=7, cost=8; generated React safety=4, flexibility=10, cost=5; static Markdown safety=10, flexibility=3, cost=10.",
			"Use Grid, Card, Metric, DataTable, Text, and a bar Chart. Clearly label that the numbers are illustrative supplied scores, and do not invent new criteria.",
		].join("\n"),
		icon: TablePropertiesIcon,
	},
	{
		id: "incident-review",
		label: "Incident review timeline",
		description: "Metric · Timeline · Sequence diagram",
		prompt: [
			"This is a read-only incident review. Do not modify the workspace.",
			"Use only this data: duration=24 minutes, affected requests=18, detected=10:02, mitigated=10:18, resolved=10:26; sequence Monitor -> Agent -> Fallback -> Recovery.",
			"Create a compact Generative UI using Metric, Timeline, DataTable, Card, Text, and a MermaidDiagram sequence diagram. Do not infer a root cause or add facts.",
		].join("\n"),
		icon: ActivityIcon,
	},
	{
		id: "weather-outlook",
		label: "Three-day weather outlook",
		description: "Tool data · Line chart · Timeline",
		prompt: [
			"Do not modify the workspace. Use weather_search to get Shanghai's next three days of weather.",
			"Use only data returned by the tool, then create a compact Generative UI with Card, Text, Metric, a line Chart, and Timeline.",
			"Give one short recommendation before the interface and do not fill missing values with invented data.",
		].join("\n"),
		icon: SparklesIcon,
	},
];

export const SUGGESTION_GROUPS: Record<SuggestionTab, ChatSuggestion[]> = {
	starter: STARTER_SUGGESTIONS,
	"generative-ui": GENERATIVE_UI_SUGGESTIONS,
};
