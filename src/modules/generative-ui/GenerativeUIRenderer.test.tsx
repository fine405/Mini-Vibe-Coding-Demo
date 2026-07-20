import type { Spec } from "@json-render/react";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GenerativeUIRenderer } from "@/modules/generative-ui/GenerativeUIRenderer";

const { renderMermaidMock } = vi.hoisted(() => ({
	renderMermaidMock: vi.fn(),
}));

const {
	addFinancialSeriesMock,
	applyFinancialOptionsMock,
	createFinancialChartMock,
	fitFinancialContentMock,
	removeFinancialChartMock,
	removeFinancialSeriesMock,
	setFinancialDataMock,
} = vi.hoisted(() => ({
	addFinancialSeriesMock: vi.fn(),
	applyFinancialOptionsMock: vi.fn(),
	createFinancialChartMock: vi.fn(),
	fitFinancialContentMock: vi.fn(),
	removeFinancialChartMock: vi.fn(),
	removeFinancialSeriesMock: vi.fn(),
	setFinancialDataMock: vi.fn(),
}));

vi.mock("lightweight-charts", () => ({
	AreaSeries: { type: "Area" },
	BarSeries: { type: "Bar" },
	BaselineSeries: { type: "Baseline" },
	CandlestickSeries: { type: "Candlestick" },
	ColorType: { Solid: "solid" },
	createChart: createFinancialChartMock,
	HistogramSeries: { type: "Histogram" },
	LineSeries: { type: "Line" },
}));

vi.mock("@/components/ai-elements/message", () => ({
	MessageResponse: ({ children }: { children: string }) => (
		<div>
			<div
				data-streamdown="mermaid-block-actions"
				data-testid="mermaid-actions"
			/>
			<pre data-testid="mermaid-source">{children}</pre>
		</div>
	),
}));

vi.mock("@streamdown/mermaid", () => ({
	mermaid: {
		getMermaid: () => ({ render: renderMermaidMock }),
	},
}));

vi.mock("recharts", async (importOriginal) => {
	const actual = await importOriginal<typeof import("recharts")>();
	const { cloneElement } = await import("react");
	return {
		...actual,
		ResponsiveContainer: ({
			children,
		}: {
			children: ReactElement<{ height?: number; width?: number }>;
		}) => cloneElement(children, { height: 260, width: 800 }),
	};
});

const dashboardSpec: Spec = {
	root: "root",
	elements: {
		root: {
			type: "Grid",
			props: { columns: 2, gap: "md" },
			children: [
				"card",
				"metric",
				"table",
				"barChart",
				"lineChart",
				"timeline",
				"diagram",
			],
		},
		card: {
			type: "Card",
			props: { title: "Overview", tone: "info" },
			children: ["text"],
		},
		text: {
			type: "Text",
			props: { content: "Build summary", variant: "body" },
			children: [],
		},
		metric: {
			type: "Metric",
			props: { label: "Tests", value: "128", trend: "up" },
			children: [],
		},
		table: {
			type: "DataTable",
			props: {
				columns: [
					{ key: "name", label: "Name" },
					{ key: "status", label: "Status" },
				],
				data: [{ name: "Typecheck", status: "Passed" }],
			},
			children: [],
		},
		barChart: {
			type: "Chart",
			props: {
				type: "bar",
				data: [
					{ label: "Before", value: 8 },
					{ label: "After", value: 12 },
				],
				xKey: "label",
				series: [{ key: "value", label: "Value" }],
			},
			children: [],
		},
		lineChart: {
			type: "Chart",
			props: {
				type: "line",
				data: [
					{ label: "Before", value: 8 },
					{ label: "After", value: 12 },
				],
				xKey: "label",
				series: [{ key: "value", label: "Value" }],
			},
			children: [],
		},
		timeline: {
			type: "Timeline",
			props: {
				items: [
					{ title: "Inspect", status: "completed" },
					{ title: "Implement", status: "current" },
				],
			},
			children: [],
		},
		diagram: {
			type: "MermaidDiagram",
			props: { code: "flowchart LR\nA --> B" },
			children: [],
		},
	},
};

const financialDashboardSpec: Spec = {
	root: "root",
	elements: {
		root: {
			type: "Stack",
			props: { gap: "md" },
			children: ["price", "indicator", "performance", "comparison"],
		},
		price: {
			type: "PriceChart",
			props: {
				symbol: "AAPL",
				interval: "1D",
				style: "candlestick",
				data: [
					{ time: "2026-07-17", open: 10, high: 12, low: 9, close: 11 },
					{ time: "2026-07-20", open: 11, high: 13, low: 10, close: 12 },
				],
			},
			children: [],
		},
		indicator: {
			type: "IndicatorPane",
			props: {
				indicator: "volume",
				series: [
					{
						label: "Volume",
						style: "histogram",
						data: [
							{ time: "2026-07-17", value: 100, direction: "up" },
							{ time: "2026-07-20", value: 80, direction: "down" },
						],
					},
				],
			},
			children: [],
		},
		performance: {
			type: "PerformanceChart",
			props: {
				mode: "equity",
				series: [
					{
						label: "Portfolio",
						data: [
							{ time: "2026-07-17", value: 100 },
							{ time: "2026-07-20", value: 104 },
						],
					},
				],
			},
			children: [],
		},
		comparison: {
			type: "ComparisonChart",
			props: {
				normalization: "percentage",
				series: [
					{
						symbol: "AAPL",
						data: [
							{ time: "2026-07-17", value: 10 },
							{ time: "2026-07-20", value: 11 },
						],
					},
					{
						symbol: "MSFT",
						data: [
							{ time: "2026-07-17", value: 20 },
							{ time: "2026-07-20", value: 21 },
						],
					},
				],
			},
			children: [],
		},
	},
};

describe("GenerativeUIRenderer", () => {
	beforeEach(() => {
		renderMermaidMock.mockReset();
		renderMermaidMock.mockImplementation(() => new Promise(() => {}));
		addFinancialSeriesMock.mockReset();
		applyFinancialOptionsMock.mockReset();
		createFinancialChartMock.mockReset();
		fitFinancialContentMock.mockReset();
		removeFinancialChartMock.mockReset();
		removeFinancialSeriesMock.mockReset();
		setFinancialDataMock.mockReset();
		addFinancialSeriesMock.mockImplementation(() => ({
			createPriceLine: vi.fn(),
			setData: setFinancialDataMock,
		}));
		createFinancialChartMock.mockImplementation(() => ({
			addSeries: addFinancialSeriesMock,
			applyOptions: applyFinancialOptionsMock,
			remove: removeFinancialChartMock,
			removeSeries: removeFinancialSeriesMock,
			timeScale: () => ({ fitContent: fitFinancialContentMock }),
		}));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders the approved data and layout components", () => {
		render(<GenerativeUIRenderer spec={dashboardSpec} />);

		expect(screen.getByText("Overview")).toBeInTheDocument();
		expect(screen.getByText("Build summary")).toBeInTheDocument();
		expect(screen.getByText("128")).toBeInTheDocument();
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(screen.getByText("Typecheck")).toBeInTheDocument();
		expect(screen.getAllByTestId("generative-chart")).toHaveLength(2);
		expect(screen.getByText("Inspect")).toBeInTheDocument();
		expect(screen.getByTestId("mermaid-source")).toHaveTextContent(
			"flowchart LR",
		);
	});

	it("uses the json-render visual rhythm for generated surfaces", () => {
		const spec: Spec = {
			root: "card",
			elements: {
				card: {
					type: "Card",
					props: { title: "Team Performance" },
					children: ["metric", "table", "button"],
				},
				metric: {
					type: "Metric",
					props: {
						label: "Weekly Revenue",
						value: "$12,400",
						trend: "up",
						detail: "+18%",
					},
					children: [],
				},
				table: {
					type: "DataTable",
					props: {
						columns: [{ key: "name", label: "Name" }],
						data: [{ name: "Render" }],
					},
					children: [],
				},
				button: {
					type: "Button",
					props: { label: "View report", variant: "outline" },
					children: [],
				},
			},
		};

		const { container } = render(<GenerativeUIRenderer spec={spec} />);

		expect(container.querySelector('[data-slot="generative-ui"]')).toHaveClass(
			"generative-ui",
			"rounded-xl",
			"bg-background",
			"p-4",
		);
		expect(screen.getByText("Team Performance").closest("section")).toHaveClass(
			"rounded-xl",
			"p-5",
			"shadow-sm",
		);
		expect(screen.getByText("Weekly Revenue").parentElement).toHaveClass(
			"space-y-1",
		);
		expect(screen.getByLabelText("up trend").parentElement).toHaveClass(
			"text-emerald-600",
		);
		expect(screen.getByRole("row", { name: "Render" })).toHaveClass(
			"hover:bg-muted/50",
		);
		expect(screen.getByRole("button", { name: "View report" })).toHaveClass(
			"h-9",
			"rounded-md",
		);
	});

	it("renders the approved financial chart components with normalized comparison data", () => {
		const { unmount } = render(
			<GenerativeUIRenderer spec={financialDashboardSpec} />,
		);

		expect(screen.getAllByTestId("financial-chart")).toHaveLength(4);
		expect(screen.getByText("AAPL")).toBeInTheDocument();
		expect(screen.getByText("Volume")).toBeInTheDocument();
		expect(screen.getByText("Equity Curve")).toBeInTheDocument();
		expect(screen.getByText("Instrument Comparison")).toBeInTheDocument();
		expect(createFinancialChartMock).toHaveBeenCalledTimes(4);
		expect(createFinancialChartMock).toHaveBeenCalledWith(
			expect.any(HTMLElement),
			expect.objectContaining({
				layout: expect.objectContaining({ attributionLogo: true }),
			}),
		);
		expect(addFinancialSeriesMock).toHaveBeenCalledTimes(5);
		expect(setFinancialDataMock).toHaveBeenCalledWith([
			{ time: "2026-07-17", value: 0 },
			{ time: "2026-07-20", value: 10 },
		]);

		unmount();
		expect(removeFinancialChartMock).toHaveBeenCalledTimes(4);
	});

	it("renders numeric metric values from literal and state props", () => {
		const spec = {
			root: "metrics",
			state: { tests: 87 },
			elements: {
				metrics: {
					type: "Grid",
					props: { columns: 2 },
					children: ["build", "tests"],
				},
				build: {
					type: "Metric",
					props: { label: "Build", value: 92 },
					children: [],
				},
				tests: {
					type: "Metric",
					props: { label: "Tests", value: { $state: "/tests" } },
					children: [],
				},
			},
		} as unknown as Spec;

		render(<GenerativeUIRenderer spec={spec} />);

		expect(screen.getByText("92")).toBeInTheDocument();
		expect(screen.getByText("87")).toBeInTheDocument();
		expect(
			screen.queryByText("Metric could not be rendered."),
		).not.toBeInTheDocument();
	});

	it("keeps button actions inside renderer state", async () => {
		const spec: Spec = {
			root: "root",
			state: { detailsOpen: false },
			elements: {
				root: {
					type: "Stack",
					props: { direction: "vertical" },
					children: ["button", "details"],
				},
				button: {
					type: "Button",
					props: { label: "Toggle details" },
					children: [],
					on: {
						press: {
							action: "toggleState",
							params: { statePath: "/detailsOpen" },
						},
					},
				},
				details: {
					type: "Text",
					props: { content: "Private renderer state" },
					children: [],
					visible: { $state: "/detailsOpen", eq: true },
				},
			},
		};

		render(<GenerativeUIRenderer spec={spec} />);
		expect(
			screen.queryByText("Private renderer state"),
		).not.toBeInTheDocument();

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Toggle details" }));
		});

		expect(screen.getByText("Private renderer state")).toBeInTheDocument();
	});

	it("shows bounded fallbacks for invalid props and unknown components", () => {
		const spec = {
			root: "root",
			elements: {
				root: {
					type: "Stack",
					props: {},
					children: ["invalid", "unknown"],
				},
				invalid: {
					type: "Metric",
					props: { label: "Missing value" },
					children: [],
				},
				unknown: {
					type: "RemoteWidget",
					props: {},
					children: [],
				},
			},
		} as unknown as Spec;

		render(<GenerativeUIRenderer spec={spec} />);

		expect(
			screen.getByText("Metric could not be rendered."),
		).toBeInTheDocument();
		expect(
			screen.getByText("Unsupported component: RemoteWidget"),
		).toBeInTheDocument();
	});

	it("refuses unsafe Mermaid source without passing it to Streamdown", () => {
		const spec: Spec = {
			root: "diagram",
			elements: {
				diagram: {
					type: "MermaidDiagram",
					props: {
						code: "flowchart LR\nA --> B\nclick A callback",
					},
					children: [],
				},
			},
		};

		render(<GenerativeUIRenderer spec={spec} />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Mermaid callbacks are not allowed.",
		);
		expect(screen.queryByTestId("mermaid-source")).not.toBeInTheDocument();
	});

	it("renders Mermaid after removing presentation-only syntax", () => {
		const spec: Spec = {
			root: "diagram",
			elements: {
				diagram: {
					type: "MermaidDiagram",
					props: {
						code: 'flowchart LR\nA["User Request<br/>Initial prompt"] --> B["Mastra Agent"]\nstyle A fill:#4A90D9',
					},
					children: [],
				},
			},
		};

		render(<GenerativeUIRenderer spec={spec} />);

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(screen.getByTestId("mermaid-source")).toHaveTextContent(
			"User Request Initial prompt",
		);
		expect(screen.getByTestId("mermaid-source")).not.toHaveTextContent(
			"style A",
		);
	});

	it("submits Mermaid downloads through the attachment endpoint", async () => {
		const code = "flowchart LR\nA --> B";
		const spec: Spec = {
			root: "diagram",
			elements: {
				diagram: {
					type: "MermaidDiagram",
					props: { code },
					children: [],
				},
			},
		};

		render(<GenerativeUIRenderer spec={spec} />);
		fireEvent.click(screen.getByRole("button", { name: "Download diagram" }));

		const mmdButton = screen.getByRole("button", { name: "MMD" });
		const form = mmdButton.closest("form");
		expect(form).toHaveAttribute("action", "/api/download");
		expect(form).toHaveAttribute("method", "post");
		expect(
			form?.querySelector<HTMLInputElement>('input[name="filename"]')?.value,
		).toBe("diagram.mmd");
		expect(
			atob(
				form?.querySelector<HTMLInputElement>('input[name="data"]')?.value ??
					"",
			),
		).toBe(code);

		fireEvent.submit(form as HTMLFormElement);
		expect(form).toBeInTheDocument();
		await waitFor(() => expect(form).not.toBeInTheDocument());
	});

	it("places the download button inside the native Mermaid action bar", async () => {
		const spec: Spec = {
			root: "diagram",
			elements: {
				diagram: {
					type: "MermaidDiagram",
					props: { code: "flowchart LR\nA --> B" },
					children: [],
				},
			},
		};

		render(<GenerativeUIRenderer spec={spec} />);

		const downloadButton = await screen.findByRole("button", {
			name: "Download diagram",
		});
		expect(screen.getByTestId("mermaid-actions")).toContainElement(
			downloadButton,
		);
		expect(downloadButton.parentElement).toHaveClass(
			"relative",
			"order-first",
			"flex",
		);
		expect(downloadButton.querySelector("svg")).toHaveAttribute("width", "16");
		expect(downloadButton.querySelector("svg")).toHaveAttribute("height", "16");
	});

	it("renders PNG downloads from the full diagram at 4K resolution", async () => {
		renderMermaidMock.mockResolvedValueOnce({
			svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><text>Diagram</text></svg>',
		});
		let rasterizedSvg = "";
		class MockImage {
			height = 150;
			naturalHeight = 150;
			naturalWidth = 300;
			onerror: (() => void) | null = null;
			onload: (() => void) | null = null;
			width = 300;

			set src(value: string) {
				const encoded = value.split(",")[1] ?? "";
				rasterizedSvg = new TextDecoder().decode(
					Uint8Array.from(atob(encoded), (character) =>
						character.charCodeAt(0),
					),
				);
				queueMicrotask(() => this.onload?.());
			}
		}
		vi.stubGlobal("Image", MockImage);

		let canvasHeight = 0;
		let canvasWidth = 0;
		vi.spyOn(HTMLCanvasElement.prototype, "height", "set").mockImplementation(
			(value) => {
				canvasHeight = value;
			},
		);
		vi.spyOn(HTMLCanvasElement.prototype, "width", "set").mockImplementation(
			(value) => {
				canvasWidth = value;
			},
		);
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
			drawImage: vi.fn(),
		} as unknown as CanvasRenderingContext2D);
		vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
			"data:image/png;base64,cG5n",
		);

		const spec: Spec = {
			root: "diagram",
			elements: {
				diagram: {
					type: "MermaidDiagram",
					props: { code: "flowchart LR\nA --> B" },
					children: [],
				},
			},
		};

		render(<GenerativeUIRenderer spec={spec} />);
		fireEvent.click(
			await screen.findByRole("button", { name: "Download diagram" }),
		);
		const pngButton = screen.getByRole("button", { name: "PNG" });
		await waitFor(() => expect(pngButton).toBeEnabled());

		expect(canvasWidth).toBe(4096);
		expect(canvasHeight).toBe(2048);
		const rasterizedRoot = new DOMParser().parseFromString(
			rasterizedSvg,
			"image/svg+xml",
		).documentElement;
		expect(rasterizedRoot.getAttribute("width")).toBe("4096");
		expect(rasterizedRoot.getAttribute("height")).toBe("2048");
	});
});
