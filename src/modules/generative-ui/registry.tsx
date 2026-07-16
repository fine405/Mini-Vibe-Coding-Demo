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
import type { ReactNode } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
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
	dataTablePropsSchema,
	generativeUiCatalog,
	gridPropsSchema,
	mermaidDiagramPropsSchema,
	metricPropsSchema,
	stackPropsSchema,
	textPropsSchema,
	timelinePropsSchema,
} from "@/modules/generative-ui/catalog";
import { MermaidDownloadMenu } from "@/modules/generative-ui/MermaidDownloadMenu";
import { validateMermaidSource } from "@/modules/generative-ui/mermaid-policy";

const gapClasses = {
	sm: "gap-2",
	md: "gap-3",
	lg: "gap-5",
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
	neutral: "border-border bg-card",
	info: "border-blue-500/30 bg-blue-500/5",
	success: "border-emerald-500/30 bg-emerald-500/5",
	warning: "border-amber-500/30 bg-amber-500/5",
	danger: "border-destructive/30 bg-destructive/5",
} as const;

const textToneClasses = {
	default: "text-foreground",
	muted: "text-muted-foreground",
	success: "text-emerald-600 dark:text-emerald-400",
	warning: "text-amber-600 dark:text-amber-400",
	danger: "text-destructive",
} as const;

const chartColors = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
];

function InvalidComponent({ name }: { name: string }) {
	return (
		<div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
			{name} could not be rendered.
		</div>
	);
}

function MermaidDiagram({ code, title }: { code: string; title?: string }) {
	const validation = validateMermaidSource(code);
	if (!validation.ok) {
		return (
			<div
				className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
				role="alert"
			>
				{validation.reason}
			</div>
		);
	}

	return (
		<div className="min-w-0 overflow-hidden rounded-md border border-border bg-background p-3">
			{title ? <p className="mb-2 text-sm font-medium">{title}</p> : null}
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
					className={`flex min-w-0 ${direction === "horizontal" ? "flex-row flex-wrap" : "flex-col"} ${gapClasses[gap]} ${alignClasses[align]}`}
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
					className={`min-w-0 rounded-lg border p-4 ${cardToneClasses[tone]}`}
				>
					{parsed.data.title ? (
						<h3 className="text-sm font-semibold">{parsed.data.title}</h3>
					) : null}
					{parsed.data.description ? (
						<p className="mt-1 text-sm text-muted-foreground">
							{parsed.data.description}
						</p>
					) : null}
					{children ? <div className="mt-3">{children}</div> : null}
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
					<h2 className={`text-xl font-semibold ${className}`}>
						{parsed.data.content}
					</h2>
				);
			}
			if (variant === "heading") {
				return (
					<h3 className={`text-base font-semibold ${className}`}>
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
						className={`block whitespace-pre-wrap rounded bg-muted px-2 py-1 font-mono text-xs ${className}`}
					>
						{parsed.data.content}
					</code>
				);
			}
			return (
				<p className={`text-sm leading-relaxed ${className}`}>
					{parsed.data.content}
				</p>
			);
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
				<div className="min-w-0 rounded-lg border border-border bg-card p-4">
					<p className="text-xs font-medium text-muted-foreground">
						{parsed.data.label}
					</p>
					<div className="mt-1 flex items-center gap-2">
						<span className="truncate text-2xl font-semibold">
							{parsed.data.value}
						</span>
						{parsed.data.trend ? (
							<TrendIcon
								aria-label={`${parsed.data.trend} trend`}
								className="size-4 text-muted-foreground"
							/>
						) : null}
					</div>
					{parsed.data.detail ? (
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
				<div className="min-w-0 overflow-x-auto rounded-lg border border-border">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
							<tr>
								{parsed.data.columns.map((column) => (
									<th
										className={`px-3 py-2 font-medium ${textAlignClasses[column.align ?? "left"]}`}
										key={column.key}
										scope="col"
									>
										{column.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{parsed.data.data.length > 0 ? (
								parsed.data.data.map((row, rowIndex) => (
									<tr key={rowIndex}>
										{parsed.data.columns.map((column) => (
											<td
												className={`px-3 py-2 ${textAlignClasses[column.align ?? "left"]}`}
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
								<tr>
									<td
										className="px-3 py-6 text-center text-muted-foreground"
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
			const parsed = chartPropsSchema.safeParse(props);
			if (!parsed.success) return <InvalidComponent name="Chart" />;
			const chartProps = parsed.data;
			const commonChildren: ReactNode = (
				<>
					<CartesianGrid strokeDasharray="3 3" vertical={false} />
					<XAxis dataKey={chartProps.xKey} tickLine={false} />
					<YAxis tickLine={false} width={40} />
					<Tooltip />
					<Legend />
				</>
			);
			return (
				<div
					aria-label={`${chartProps.type} chart`}
					className="h-72 min-w-0 rounded-lg border border-border bg-card p-3"
					data-testid="generative-chart"
					role="img"
				>
					<ResponsiveContainer height="100%" minWidth={0} width="100%">
						{chartProps.type === "bar" ? (
							<BarChart data={chartProps.data}>
								{commonChildren}
								{chartProps.series.map((series, index) => (
									<Bar
										dataKey={series.key}
										fill={chartColors[index]}
										key={series.key}
										name={series.label}
										radius={4}
									/>
								))}
							</BarChart>
						) : (
							<LineChart data={chartProps.data}>
								{commonChildren}
								{chartProps.series.map((series, index) => (
									<Line
										dataKey={series.key}
										dot={false}
										key={series.key}
										name={series.label}
										stroke={chartColors[index]}
										strokeWidth={2}
										type="monotone"
									/>
								))}
							</LineChart>
						)}
					</ResponsiveContainer>
				</div>
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
									className={`absolute -left-[1.68rem] top-0.5 size-3.5 bg-background ${item.status === "failed" ? "text-destructive" : item.status === "completed" ? "text-emerald-500" : item.status === "current" ? "text-blue-500" : "text-muted-foreground"}`}
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
	<div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
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
