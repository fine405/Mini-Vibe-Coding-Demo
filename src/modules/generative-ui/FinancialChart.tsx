"use client";

import {
	AreaSeries,
	BarSeries,
	BaselineSeries,
	CandlestickSeries,
	ColorType,
	createChart,
	HistogramSeries,
	LineSeries,
	type Time,
	type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

export type FinancialValuePoint = {
	time: string | number;
	value: number;
	direction?: "up" | "down" | "neutral";
};

export type FinancialOhlcPoint = {
	time: string | number;
	open: number;
	high: number;
	low: number;
	close: number;
};

export type FinancialSeries =
	| {
			type: "candlestick";
			label: string;
			data: FinancialOhlcPoint[];
	  }
	| {
			type: "bar";
			label: string;
			data: FinancialOhlcPoint[];
	  }
	| {
			type: "line";
			label: string;
			data: FinancialValuePoint[];
	  }
	| {
			type: "area";
			label: string;
			data: FinancialValuePoint[];
	  }
	| {
			type: "histogram";
			label: string;
			data: FinancialValuePoint[];
	  }
	| {
			type: "baseline";
			label: string;
			data: FinancialValuePoint[];
			baseValue?: number;
	  };

type FinancialChartProps = {
	ariaLabel: string;
	series: FinancialSeries[];
	title?: string;
	subtitle?: string;
	referenceLines?: number[];
	compact?: boolean;
};

const SERIES_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#14b8a6"];
const POSITIVE_COLOR = "#22c55e";
const NEGATIVE_COLOR = "#ef4444";
const NEUTRAL_COLOR = "#64748b";
const EMPTY_REFERENCE_LINES: number[] = [];

const toTime = (value: string | number): Time =>
	typeof value === "number" ? (value as UTCTimestamp) : value;

const readThemeColor = (
	styles: CSSStyleDeclaration,
	name: string,
	fallback: string,
) => styles.getPropertyValue(name).trim() || fallback;

export function FinancialChart({
	ariaLabel,
	series,
	title,
	subtitle,
	referenceLines = EMPTY_REFERENCE_LINES,
	compact = false,
}: FinancialChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
	const removeSeriesRef = useRef<Array<() => void>>([]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const styles = getComputedStyle(container);
		const chart = createChart(container, {
			autoSize: true,
			layout: {
				background: { type: ColorType.Solid, color: "transparent" },
				textColor: readThemeColor(styles, "--muted-foreground", "#64748b"),
				attributionLogo: true,
			},
			grid: {
				vertLines: {
					color: readThemeColor(styles, "--border", "#e2e8f0"),
				},
				horzLines: {
					color: readThemeColor(styles, "--border", "#e2e8f0"),
				},
			},
			rightPriceScale: {
				borderColor: readThemeColor(styles, "--border", "#e2e8f0"),
			},
			timeScale: {
				borderColor: readThemeColor(styles, "--border", "#e2e8f0"),
				timeVisible: true,
				secondsVisible: false,
			},
		});
		chartRef.current = chart;

		const applyTheme = () => {
			const currentStyles = getComputedStyle(container);
			const borderColor = readThemeColor(currentStyles, "--border", "#e2e8f0");
			chart.applyOptions({
				layout: {
					background: { type: ColorType.Solid, color: "transparent" },
					textColor: readThemeColor(
						currentStyles,
						"--muted-foreground",
						"#64748b",
					),
				},
				grid: {
					vertLines: { color: borderColor },
					horzLines: { color: borderColor },
				},
				rightPriceScale: { borderColor },
				timeScale: { borderColor },
			});
		};

		const observer = new MutationObserver(applyTheme);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-mode", "data-theme"],
		});

		return () => {
			observer.disconnect();
			removeSeriesRef.current = [];
			chartRef.current = null;
			chart.remove();
		};
	}, []);

	useEffect(() => {
		const chart = chartRef.current;
		if (!chart) return;

		for (const removeSeries of removeSeriesRef.current) removeSeries();
		removeSeriesRef.current = [];

		series.forEach((definition, index) => {
			const color = SERIES_COLORS[index] ?? SERIES_COLORS[0];
			if (definition.type === "candlestick") {
				const api = chart.addSeries(CandlestickSeries, {
					title: definition.label,
					upColor: POSITIVE_COLOR,
					downColor: NEGATIVE_COLOR,
					borderVisible: false,
					wickUpColor: POSITIVE_COLOR,
					wickDownColor: NEGATIVE_COLOR,
				});
				api.setData(
					definition.data.map((point) => ({
						...point,
						time: toTime(point.time),
					})),
				);
				removeSeriesRef.current.push(() => chart.removeSeries(api));
				return;
			}

			if (definition.type === "bar") {
				const api = chart.addSeries(BarSeries, {
					title: definition.label,
					upColor: POSITIVE_COLOR,
					downColor: NEGATIVE_COLOR,
				});
				api.setData(
					definition.data.map((point) => ({
						...point,
						time: toTime(point.time),
					})),
				);
				removeSeriesRef.current.push(() => chart.removeSeries(api));
				return;
			}

			if (definition.type === "area") {
				const api = chart.addSeries(AreaSeries, {
					title: definition.label,
					lineColor: color,
					topColor: `${color}55`,
					bottomColor: `${color}08`,
				});
				api.setData(
					definition.data.map((point) => ({
						time: toTime(point.time),
						value: point.value,
					})),
				);
				removeSeriesRef.current.push(() => chart.removeSeries(api));
				return;
			}

			if (definition.type === "baseline") {
				const api = chart.addSeries(BaselineSeries, {
					title: definition.label,
					baseValue: {
						type: "price",
						price: definition.baseValue ?? definition.data[0]?.value ?? 0,
					},
					topLineColor: POSITIVE_COLOR,
					topFillColor1: "#22c55e55",
					topFillColor2: "#22c55e08",
					bottomLineColor: NEGATIVE_COLOR,
					bottomFillColor1: "#ef444408",
					bottomFillColor2: "#ef444455",
				});
				api.setData(
					definition.data.map((point) => ({
						time: toTime(point.time),
						value: point.value,
					})),
				);
				removeSeriesRef.current.push(() => chart.removeSeries(api));
				return;
			}

			if (definition.type === "histogram") {
				const api = chart.addSeries(HistogramSeries, {
					title: definition.label,
					color,
				});
				api.setData(
					definition.data.map((point) => ({
						time: toTime(point.time),
						value: point.value,
						color:
							point.direction === "up"
								? POSITIVE_COLOR
								: point.direction === "down"
									? NEGATIVE_COLOR
									: point.direction === "neutral"
										? NEUTRAL_COLOR
										: color,
					})),
				);
				removeSeriesRef.current.push(() => chart.removeSeries(api));
				return;
			}

			const api = chart.addSeries(LineSeries, {
				title: definition.label,
				color,
				lineWidth: 2,
			});
			api.setData(
				definition.data.map((point) => ({
					time: toTime(point.time),
					value: point.value,
				})),
			);
			if (index === 0) {
				for (const price of referenceLines) {
					api.createPriceLine({
						price,
						color: NEUTRAL_COLOR,
						lineWidth: 1,
						lineStyle: 2,
						axisLabelVisible: true,
						title: String(price),
					});
				}
			}
			removeSeriesRef.current.push(() => chart.removeSeries(api));
		});

		chart.timeScale().fitContent();
	}, [referenceLines, series]);

	return (
		<figure
			aria-label={ariaLabel}
			className="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
			data-testid="financial-chart"
			role="img"
		>
			{title || subtitle ? (
				<figcaption className="flex flex-wrap items-baseline gap-x-2 border-b border-border px-3 py-2">
					{title ? <span className="text-sm font-medium">{title}</span> : null}
					{subtitle ? (
						<span className="text-xs text-muted-foreground">{subtitle}</span>
					) : null}
				</figcaption>
			) : null}
			<div
				className={compact ? "h-56 min-w-0" : "h-72 min-w-0"}
				ref={containerRef}
			/>
		</figure>
	);
}
