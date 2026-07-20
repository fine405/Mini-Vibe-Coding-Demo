import {
	ActivityIcon,
	BarChart3Icon,
	ChartAreaIcon,
	ChartCandlestickIcon,
	ChartNoAxesCombinedIcon,
	ChartSplineIcon,
	GaugeIcon,
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

export type SuggestionTab = "starter" | "generative-ui" | "trading";

export interface ChatSuggestion {
	id: string;
	label: string;
	description: string;
	prompt: string;
	icon: LucideIcon;
	images: {
		light: string;
		dark: string;
	};
}

const promptImages = (id: string): ChatSuggestion["images"] => ({
	light: `/prompt-images/light/${id}.webp`,
	dark: `/prompt-images/dark/${id}.webp`,
});

export const STARTER_SUGGESTIONS: ChatSuggestion[] = [
	{
		id: "review-ux",
		label: "Review the current app",
		description: "Find focused UX improvements",
		prompt: "Review the current app and improve its UX",
		icon: SearchIcon,
		images: promptImages("review-ux"),
	},
	{
		id: "add-feature",
		label: "Add a useful feature",
		description: "Inspect the project and extend it",
		prompt: "Add a useful feature to this project",
		icon: PlusIcon,
		images: promptImages("add-feature"),
	},
	{
		id: "fix-problems",
		label: "Find and fix problems",
		description: "Diagnose the codebase first",
		prompt: "Find and fix problems in the codebase",
		icon: WrenchIcon,
		images: promptImages("fix-problems"),
	},
	{
		id: "improve-accessibility",
		label: "Improve accessibility",
		description: "Audit the main user flow",
		prompt:
			"Audit the current app's main user flow for accessibility issues and implement the highest-impact fixes",
		icon: SparklesIcon,
		images: promptImages("improve-accessibility"),
	},
	{
		id: "add-tests",
		label: "Strengthen test coverage",
		description: "Cover the riskiest behavior",
		prompt:
			"Inspect the current test coverage and add focused tests for the highest-risk untested behavior",
		icon: ListChecksIcon,
		images: promptImages("add-tests"),
	},
	{
		id: "simplify-architecture",
		label: "Simplify one deep module",
		description: "Reduce complexity without a rewrite",
		prompt:
			"Find one unnecessarily complicated module, explain the problem, and implement the smallest safe simplification",
		icon: GitBranchIcon,
		images: promptImages("simplify-architecture"),
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
		images: promptImages("project-health-dashboard"),
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
		images: promptImages("release-readiness"),
	},
	{
		id: "agent-architecture",
		label: "Agent architecture diagram",
		description: "Mermaid · Card · Text",
		prompt: [
			"This is a read-only explanation. Do not modify the workspace.",
			"Create a Generative UI architecture explanation for exactly this flow: User Request -> Mastra Agent -> AI SDK UIMessage Stream -> pipeJsonRender -> data-spec parts -> Safe React Registry.",
			"Use MermaidDiagram as the primary flowchart, with a Card and concise Text legend. Use plain-text Mermaid labels. Do not add systems, links, callbacks, style directives, HTML, or facts that were not supplied.",
		].join("\n"),
		icon: WorkflowIcon,
		images: promptImages("agent-architecture"),
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
		images: promptImages("product-comparison"),
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
		images: promptImages("incident-review"),
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
		images: promptImages("weather-outlook"),
	},
];

export const TRADING_SUGGESTIONS: ChatSuggestion[] = [
	{
		id: "candlestick-moving-averages",
		label: "Candlestick + MA",
		description: "Price action with a moving average overlay",
		prompt: [
			"This is a read-only trading visualization. Do not modify the workspace.",
			"Use only this supplied BTCUSD daily data: 2026-07-14 O=118.2 H=121.4 L=117.1 C=120.6 MA20=116.8; 2026-07-15 O=120.6 H=123.2 L=119.7 C=122.1 MA20=117.5; 2026-07-16 O=122.1 H=122.8 L=118.9 C=119.8 MA20=118.1; 2026-07-17 O=119.8 H=124.0 L=119.2 C=123.4 MA20=118.9; 2026-07-18 O=123.4 H=125.1 L=121.6 C=122.7 MA20=119.6.",
			"Create a compact Card with a candlestick PriceChart and one MA20 overlay. Clearly label the data as supplied demo data and do not calculate or invent values.",
		].join("\n"),
		icon: ChartCandlestickIcon,
		images: promptImages("candlestick-moving-averages"),
	},
	{
		id: "volume-macd",
		label: "Volume & MACD",
		description: "Participation and momentum in aligned panes",
		prompt: [
			"This is a read-only trading visualization. Do not modify the workspace.",
			"Use only these supplied daily values: dates 2026-07-14..2026-07-18; BTCUSD close=120.6,122.1,119.8,123.4,122.7; volume=82,96,114,132,105; MACD=1.2,1.6,1.1,1.9,1.7; signal=1.0,1.2,1.3,1.4,1.5; histogram=0.2,0.4,-0.2,0.5,0.2.",
			"Compose a compact vertical Stack with a line PriceChart, a volume IndicatorPane, and a MACD IndicatorPane. Label the values as supplied demo data and do not infer a trade signal.",
		].join("\n"),
		icon: ChartNoAxesCombinedIcon,
		images: promptImages("volume-macd"),
	},
	{
		id: "rsi-momentum",
		label: "RSI momentum",
		description: "Price trend with an oscillator pane",
		prompt: [
			"This is a read-only trading visualization. Do not modify the workspace.",
			"Use only this supplied ETHUSD daily data: 2026-07-14 close=3520 RSI=54; 2026-07-15 close=3595 RSI=61; 2026-07-16 close=3478 RSI=47; 2026-07-17 close=3652 RSI=66; 2026-07-18 close=3610 RSI=59.",
			"Create a compact Card containing an area PriceChart and an RSI IndicatorPane. State that 70 and 30 are conventional reference levels in the text only; do not add unsupplied chart points or recommendations.",
		].join("\n"),
		icon: GaugeIcon,
		images: promptImages("rsi-momentum"),
	},
	{
		id: "equity-benchmark",
		label: "Equity vs benchmark",
		description: "Strategy performance against a reference",
		prompt: [
			"This is a read-only backtest visualization. Do not modify the workspace.",
			"Use only these supplied indexed values: 2026-07-14 strategy=100 benchmark=100; 2026-07-15 strategy=102 benchmark=101; 2026-07-16 strategy=99 benchmark=100.5; 2026-07-17 strategy=105 benchmark=102; 2026-07-18 strategy=108 benchmark=103.",
			"Create a compact Card with a benchmark PerformanceChart containing Strategy and Benchmark series. Label the values as supplied demo data and do not add performance statistics.",
		].join("\n"),
		icon: ChartSplineIcon,
		images: promptImages("equity-benchmark"),
	},
	{
		id: "drawdown-analysis",
		label: "Drawdown analysis",
		description: "Depth and recovery across a backtest",
		prompt: [
			"This is a read-only backtest visualization. Do not modify the workspace.",
			"Use only this supplied drawdown series: 2026-07-14=0; 2026-07-15=-1.8; 2026-07-16=-4.6; 2026-07-17=-2.9; 2026-07-18=-1.1; maximum drawdown=-4.6%.",
			"Create a compact Card with a Metric for maximum drawdown and a drawdown PerformanceChart. Clearly label the values as supplied demo data and do not infer recovery time.",
		].join("\n"),
		icon: ChartAreaIcon,
		images: promptImages("drawdown-analysis"),
	},
	{
		id: "multi-asset-comparison",
		label: "Asset comparison",
		description: "Normalized returns across three markets",
		prompt: [
			"This is a read-only market comparison. Do not modify the workspace.",
			"Use only these supplied daily prices: dates 2026-07-14..2026-07-18; BTCUSD=118.2,120.6,119.8,123.4,122.7; ETHUSD=3520,3595,3478,3652,3610; SPY=632.1,634.8,631.4,637.2,638.0.",
			"Create a compact Card with a percentage-normalized ComparisonChart for BTCUSD, ETHUSD, and SPY. Label the values as supplied demo data and do not rank or recommend the assets.",
		].join("\n"),
		icon: BarChart3Icon,
		images: promptImages("multi-asset-comparison"),
	},
];

export const SUGGESTION_GROUPS: Record<SuggestionTab, ChatSuggestion[]> = {
	starter: STARTER_SUGGESTIONS,
	"generative-ui": GENERATIVE_UI_SUGGESTIONS,
	trading: TRADING_SUGGESTIONS,
};
