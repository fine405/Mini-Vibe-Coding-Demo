"use client";

import { setByPath } from "@json-render/core";
import { defineRegistry, Renderer, type Spec } from "@json-render/react";
import {
	ArrowDownRight,
	ArrowUpRight,
	Circle,
	CircleCheck,
	CircleX,
	Minus,
} from "lucide-react";
import { type ReactNode, useId } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button as AppButton } from "@/components/ui/button";
import { getToggleStateUpdate } from "@/modules/generative-ui/actions";
import {
	buttonPropsSchema,
	cardPropsSchema,
	chartPropsSchema,
	comparisonChartPropsSchema,
	dataTablePropsSchema,
	generativeUiCatalog,
	gridPropsSchema,
	indicatorPanePropsSchema,
	mermaidDiagramPropsSchema,
	metricPropsSchema,
	performanceChartPropsSchema,
	priceChartPropsSchema,
	stackPropsSchema,
	textPropsSchema,
	timelinePropsSchema,
} from "@/modules/generative-ui/catalog";
import {
	FinancialChart,
	type FinancialSeries,
} from "@/modules/generative-ui/FinancialChart";
import { MermaidDownloadMenu } from "@/modules/generative-ui/MermaidDownloadMenu";
import { validateMermaidSource } from "@/modules/generative-ui/mermaid-policy";

const gapClasses = {
	sm: "gap-2",
	md: "gap-3",
	lg: "gap-4",
} as const;

const alignClasses = {
	start: "items-start",
	center: "items-center",
	end: "items-end",
	stretch: "items-stretch",
} as const;

const gridColumnClasses: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-1 sm:grid-cols-2",
	3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
	4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

const textAlignClasses = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
} as const;

const cardToneClasses = {
	neutral: "border-border bg-card text-card-foreground",
	info: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-50",
	success:
		"border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-50",
	warning:
		"border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50",
	danger: "border-destructive/40 bg-destructive/10 text-destructive",
} as const;

const textToneClasses = {
	default: "text-foreground",
	muted: "text-muted-foreground",
	success: "text-emerald-600 dark:text-emerald-400",
	warning: "text-amber-600 dark:text-amber-400",
	danger: "text-destructive",
} as const;

const chartColors = [
	"var(--primary)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
];
const CHART_MARGIN = { bottom: 0, left: 24, right: 24, top: 8 } as const;

const RSI_REFERENCE_LINES = [30, 70];
const ZERO_REFERENCE_LINE = [0];

function InvalidComponent({ name }: { name: string }) {
	return (
		<div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
			{name} could not be rendered.
		</div>
	);
}

function MermaidDiagram({ code, title }: { code: string; title?: string }) {
	const validation = validateMermaidSource(code);
	if (!validation.ok) {
		return (
			<div
				className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
				role="alert"
			>
				{validation.reason}
			</div>
		);
	}

	return (
		<div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
			{title ? (
				<p className="mb-3 text-sm font-medium tracking-tight">{title}</p>
			) : null}
			<div className="relative">
				<MermaidDownloadMenu code={validation.source} />
				<MessageResponse controls={{ mermaid: { download: false } }}>
					{`\`\`\`mermaid\n${validation.source}\n\`\`\``}
				</MessageResponse>
			</div>
		</div>
	);
}

const { registry: generativeUiRegistry } = defineRegistry(generativeUiCatalog, {
	components: {
		Stack: ({ props, children }) => {
			const parsed = stackPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="Stack" />;
			const direction = parsed.data.direction ?? "vertical";
			const gap = parsed.data.gap ?? "md";
			const align = parsed.data.align ?? "stretch";
			return (
				<div
					className={`flex min-w-0 ${direction === "horizontal" ? "flex-row flex-wrap" : "w-full flex-col"} ${gapClasses[gap]} ${alignClasses[align]}`}
				>
					{children}
				</div>
			);
		},
		Grid: ({ props, children }) => {
			const parsed = gridPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="Grid" />;
			const columns = parsed.data.columns ?? 2;
			const gap = parsed.data.gap ?? "md";
			return (
				<div
					className={`grid min-w-0 ${gridColumnClasses[columns]} ${gapClasses[gap]}`}
				>
					{children}
				</div>
			);
		},
		Card: ({ props, children }) => {
			const parsed = cardPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="Card" />;
			const tone = parsed.data.tone ?? "neutral";
			return (
				<section
					className={`flex min-w-0 flex-col overflow-hidden rounded-xl border p-5 shadow-sm ${cardToneClasses[tone]}`}
				>
					{parsed.data.title || parsed.data.description ? (
						<header className="mb-4">
							{parsed.data.title ? (
								<h3 className="text-lg font-semibold tracking-tight">
									{parsed.data.title}
								</h3>
							) : null}
							{parsed.data.description ? (
								<p className="mt-1 text-sm text-muted-foreground">
									{parsed.data.description}
								</p>
							) : null}
						</header>
					) : null}
					{children ? (
						<div className="flex flex-1 flex-col gap-4 [&>:last-child]:mt-auto">
							{children}
						</div>
					) : null}
				</section>
			);
		},
		Text: ({ props }) => {
			const parsed = textPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="Text" />;
			const variant = parsed.data.variant ?? "body";
			const tone = parsed.data.tone ?? "default";
			const className = textToneClasses[tone];
			if (variant === "title") {
				return (
					<h2 className={`text-2xl font-bold tracking-tight ${className}`}>
						{parsed.data.content}
					</h2>
				);
			}
			if (variant === "heading") {
				return (
					<h3 className={`text-xl font-semibold tracking-tight ${className}`}>
						{parsed.data.content}
					</h3>
				);
			}
			if (variant === "caption") {
				return <p className={`text-xs ${className}`}>{parsed.data.content}</p>;
			}
			if (variant === "code") {
				return (
					<code
						className={`block whitespace-pre-wrap rounded-md bg-muted px-2 py-1 font-mono text-sm ${className}`}
					>
						{parsed.data.content}
					</code>
				);
			}
			return <p className={`text-sm ${className}`}>{parsed.data.content}</p>;
		},
		Metric: ({ props }) => {
			const parsed = metricPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="Metric" />;
			const TrendIcon =
				parsed.data.trend === "up"
					? ArrowUpRight
					: parsed.data.trend === "down"
						? ArrowDownRight
						: Minus;
			return (
				<div className="min-w-0 space-y-1">
					<p className="text-sm text-muted-foreground">{parsed.data.label}</p>
					<div className="flex min-w-0 items-baseline gap-1.5">
						<span className="truncate text-2xl font-semibold tracking-tight tabular-nums">
							{parsed.data.value}
						</span>
						{parsed.data.trend ? (
							<span
								className={`inline-flex shrink-0 items-center gap-0.5 text-sm font-medium ${
									parsed.data.trend === "up"
										? "text-emerald-600 dark:text-emerald-400"
										: parsed.data.trend === "down"
											? "text-red-600 dark:text-red-400"
											: "text-muted-foreground"
								}`}
							>
								<TrendIcon
									aria-label={`${parsed.data.trend} trend`}
									className="size-3.5"
								/>
								{parsed.data.detail ? <span>{parsed.data.detail}</span> : null}
							</span>
						) : null}
					</div>
					{parsed.data.detail && !parsed.data.trend ? (
						<p className="mt-1 text-xs text-muted-foreground">
							{parsed.data.detail}
						</p>
					) : null}
				</div>
			);
		},
		DataTable: ({ props }) => {
			const parsed = dataTablePropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="DataTable" />;
			return (
				<div className="min-w-0 overflow-x-auto rounded-md border border-border">
					<table className="w-full caption-bottom text-left text-sm">
						<thead className="[&_tr]:border-b">
							<tr>
								{parsed.data.columns.map((column) => (
									<th
										className={`h-10 whitespace-nowrap px-2 align-middle font-medium text-foreground ${textAlignClasses[column.align ?? "left"]}`}
										key={column.key}
										scope="col"
									>
										{column.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="[&_tr:last-child]:border-0">
							{parsed.data.data.length > 0 ? (
								parsed.data.data.map((row, rowIndex) => (
									<tr
										className="border-b transition-colors hover:bg-muted/50"
										key={rowIndex}
									>
										{parsed.data.columns.map((column) => (
											<td
												className={`whitespace-nowrap p-2 align-middle ${textAlignClasses[column.align ?? "left"]}`}
												key={column.key}
											>
												{row[column.key] === null ||
												row[column.key] === undefined
													? "—"
													: String(row[column.key])}
											</td>
										))}
									</tr>
								))
							) : (
								<tr className="border-b">
									<td
										className="p-8 text-center text-muted-foreground"
										colSpan={parsed.data.columns.length}
									>
										{parsed.data.emptyText ?? "No data"}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			);
		},
		Chart: ({ props }) => {
			const chartId = useId().replaceAll(":", "");
			const parsed = chartPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="Chart" />;
			const chartProps = parsed.data;
			const commonChildren: ReactNode = (
				<>
					<CartesianGrid stroke="var(--border)" vertical={false} />
					<XAxis
						axisLine={false}
						dataKey={chartProps.xKey}
						tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
						tickLine={false}
					/>
					<YAxis
						axisLine={false}
						hide
						tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
						tickLine={false}
						width={40}
					/>
					<Tooltip
						contentStyle={{
							background: "var(--popover)",
							border: "1px solid var(--border)",
							borderRadius: "var(--radius)",
							color: "var(--popover-foreground)",
						}}
					/>
					{chartProps.series.length > 1 ? (
						<Legend wrapperStyle={{ color: "var(--muted-foreground)" }} />
					) : null}
				</>
			);
			return (
				<div
					aria-label={`${chartProps.type} chart`}
					className="h-64 min-w-0"
					data-testid="generative-chart"
					role="img"
				>
					<ResponsiveContainer height="100%" minWidth={0} width="100%">
						{chartProps.type === "bar" ? (
							<BarChart data={chartProps.data} margin={CHART_MARGIN}>
								{commonChildren}
								{chartProps.series.map((series, index) => (
									<Bar
										dataKey={series.key}
										fill={chartColors[index]}
										isAnimationActive={false}
										key={series.key}
										name={series.label}
										radius={4}
									/>
								))}
							</BarChart>
						) : (
							<AreaChart data={chartProps.data} margin={CHART_MARGIN}>
								<defs>
									{chartProps.series.map((series, index) => (
										<linearGradient
											id={`${chartId}-${index}`}
											key={series.key}
											x1="0"
											x2="0"
											y1="0"
											y2="1"
										>
											<stop
												offset="0%"
												stopColor={chartColors[index]}
												stopOpacity={0.18}
											/>
											<stop
												offset="100%"
												stopColor={chartColors[index]}
												stopOpacity={0.02}
											/>
										</linearGradient>
									))}
								</defs>
								{commonChildren}
								{chartProps.series.map((series, index) => (
									<Area
										dataKey={series.key}
										dot={{
											fill: chartColors[index],
											r: 4,
											strokeWidth: 0,
										}}
										fill={`url(#${chartId}-${index})`}
										isAnimationActive={false}
										key={series.key}
										name={series.label}
										stroke={chartColors[index]}
										strokeWidth={2}
										type="monotone"
									/>
								))}
							</AreaChart>
						)}
					</ResponsiveContainer>
				</div>
			);
		},
		PriceChart: ({ props }) => {
			const parsed = priceChartPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="PriceChart" />;
			const chartProps = parsed.data;
			let priceSeries: FinancialSeries;
			if (chartProps.style === "candlestick") {
				priceSeries = {
					type: "candlestick",
					label: chartProps.symbol,
					data: chartProps.data,
				};
			} else if (chartProps.style === "ohlc") {
				priceSeries = {
					type: "bar",
					label: chartProps.symbol,
					data: chartProps.data,
				};
			} else if (chartProps.style === "baseline") {
				priceSeries = {
					type: "baseline",
					label: chartProps.symbol,
					data: chartProps.data,
					baseValue: chartProps.baseValue,
				};
			} else {
				priceSeries = {
					type: chartProps.style,
					label: chartProps.symbol,
					data: chartProps.data,
				};
			}
			const series: FinancialSeries[] = [
				priceSeries,
				...(chartProps.overlays ?? []).map(
					(overlay): FinancialSeries => ({
						type: "line",
						label: overlay.label,
						data: overlay.data,
					}),
				),
			];
			return (
				<FinancialChart
					ariaLabel={`${chartProps.symbol} price chart`}
					series={series}
					subtitle={chartProps.interval}
					title={chartProps.title ?? chartProps.symbol}
				/>
			);
		},
		IndicatorPane: ({ props }) => {
			const parsed = indicatorPanePropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="IndicatorPane" />;
			const chartProps = parsed.data;
			const title =
				chartProps.title ??
				{
					volume: "Volume",
					macd: "MACD",
					rsi: "RSI",
					openInterest: "Open Interest",
					funding: "Funding Rate",
				}[chartProps.indicator];
			const series = chartProps.series.map(
				(item): FinancialSeries => ({
					type: item.style,
					label: item.label,
					data: item.data,
				}),
			);
			return (
				<FinancialChart
					ariaLabel={`${title} indicator chart`}
					compact
					referenceLines={
						chartProps.indicator === "rsi"
							? RSI_REFERENCE_LINES
							: chartProps.indicator === "macd" ||
									chartProps.indicator === "funding"
								? ZERO_REFERENCE_LINE
								: undefined
					}
					series={series}
					title={title}
				/>
			);
		},
		PerformanceChart: ({ props }) => {
			const parsed = performanceChartPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="PerformanceChart" />;
			const chartProps = parsed.data;
			const series = chartProps.series.map((item, index): FinancialSeries => {
				if (chartProps.mode === "return") {
					return {
						type: "baseline",
						label: item.label,
						data: item.data,
						baseValue: 0,
					};
				}
				return {
					type:
						chartProps.mode === "drawdown" ||
						(chartProps.mode === "equity" && index === 0)
							? "area"
							: "line",
					label: item.label,
					data: item.data,
				};
			});
			const title =
				chartProps.title ??
				{
					equity: "Equity Curve",
					return: "Return",
					benchmark: "Benchmark Performance",
					drawdown: "Drawdown",
				}[chartProps.mode];
			return (
				<FinancialChart
					ariaLabel={`${title} chart`}
					series={series}
					title={title}
				/>
			);
		},
		ComparisonChart: ({ props }) => {
			const parsed = comparisonChartPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="ComparisonChart" />;
			const chartProps = parsed.data;
			const normalization = chartProps.normalization ?? "percentage";
			const series = chartProps.series.map((item): FinancialSeries => {
				const firstValue = item.data[0]?.value ?? 0;
				return {
					type: "line",
					label: item.symbol,
					data:
						normalization === "percentage"
							? item.data.map((point) => ({
									...point,
									value:
										Math.round((point.value / firstValue - 1) * 100 * 100) /
										100,
								}))
							: item.data,
				};
			});
			return (
				<FinancialChart
					ariaLabel="Instrument comparison chart"
					referenceLines={
						normalization === "percentage" ? ZERO_REFERENCE_LINE : undefined
					}
					series={series}
					subtitle={
						normalization === "percentage" ? "Normalized return (%)" : undefined
					}
					title={chartProps.title ?? "Instrument Comparison"}
				/>
			);
		},
		Button: ({ props, emit }) => {
			const parsed = buttonPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="Button" />;
			const variant =
				parsed.data.variant === "primary"
					? "default"
					: parsed.data.variant === "danger"
						? "destructive"
						: (parsed.data.variant ?? "secondary");
			return (
				<AppButton
					className="h-9 rounded-md px-4 py-2"
					disabled={parsed.data.disabled}
					onClick={() => emit("press")}
					type="button"
					variant={variant}
				>
					{parsed.data.label}
				</AppButton>
			);
		},
		Timeline: ({ props }) => {
			const parsed = timelinePropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="Timeline" />;
			return (
				<ol className="relative ml-2 border-l border-border pl-5">
					{parsed.data.items.map((item, index) => {
						const StatusIcon =
							item.status === "completed"
								? CircleCheck
								: item.status === "failed"
									? CircleX
									: item.status === "current"
										? Circle
										: Circle;
						return (
							<li
								className="relative pb-5 last:pb-0"
								key={`${item.title}:${index}`}
							>
								<StatusIcon
									aria-label={item.status ?? "upcoming"}
									className={`absolute -left-[1.68rem] top-0.5 size-3.5 bg-card ${item.status === "failed" ? "text-destructive" : item.status === "completed" ? "text-emerald-500" : item.status === "current" ? "text-blue-500" : "text-muted-foreground"}`}
								/>
								<div className="flex flex-wrap items-baseline gap-x-2">
									<p className="text-sm font-medium">{item.title}</p>
									{item.time ? (
										<time className="text-xs text-muted-foreground">
											{item.time}
										</time>
									) : null}
								</div>
								{item.description ? (
									<p className="mt-1 text-sm text-muted-foreground">
										{item.description}
									</p>
								) : null}
							</li>
						);
					})}
				</ol>
			);
		},
		MermaidDiagram: ({ props }) => {
			const parsed = mermaidDiagramPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="MermaidDiagram" />;
			return (
				<MermaidDiagram code={parsed.data.code} title={parsed.data.title} />
			);
		},
	},
	actions: {
		toggleState: async (params, setState, state) => {
			const update = getToggleStateUpdate(params, state);
			if (!update) return;
			setState((previous) => {
				const next = structuredClone(previous);
				setByPath(next, update.statePath, update.value);
				return next;
			});
		},
	},
});

const fallback = ({ element }: { element: { type: string } }) => (
	<div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
		Unsupported component: {element.type}
	</div>
);

export function GeneratedSpecRenderer({
	spec,
	loading,
}: {
	spec: Spec;
	loading: boolean;
}) {
	return (
		<Renderer
			fallback={fallback}
			loading={loading}
			registry={generativeUiRegistry}
			spec={spec}
		/>
	);
}
