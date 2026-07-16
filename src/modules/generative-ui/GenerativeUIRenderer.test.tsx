import type { Spec } from "@json-render/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { GenerativeUIRenderer } from "@/modules/generative-ui/GenerativeUIRenderer";

vi.mock("@/components/ai-elements/message", () => ({
	MessageResponse: ({ children }: { children: string }) => (
		<pre data-testid="mermaid-source">{children}</pre>
	),
}));

vi.mock("@streamdown/mermaid", () => ({
	mermaid: {
		getMermaid: () => ({ render: () => new Promise(() => {}) }),
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

describe("GenerativeUIRenderer", () => {
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

	it("submits Mermaid downloads through the attachment endpoint", () => {
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
	});
});
