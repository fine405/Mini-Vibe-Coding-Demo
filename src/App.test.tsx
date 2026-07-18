import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { useLayoutStore } from "@/modules/layout/store";
import { TOUR_STORAGE_KEY } from "@/modules/tour/constants";

vi.mock("react-resizable-panels", async () => {
	const { forwardRef, useImperativeHandle } = await import("react");
	return {
		Panel: forwardRef(function MockPanel(
			{ children }: { children: React.ReactNode },
			ref,
		) {
			useImperativeHandle(ref, () => ({
				collapse: () => {},
				expand: () => {},
				getId: () => "mock-panel",
				getSize: () => 50,
				isCollapsed: () => false,
				isExpanded: () => true,
				resize: () => {},
			}));
			return <div>{children}</div>;
		}),
		PanelGroup: ({ children }: { children: React.ReactNode }) => (
			<div>{children}</div>
		),
		PanelResizeHandle: () => <div />,
	};
});

vi.mock("@codesandbox/sandpack-react", () => ({
	useSandpack: () => ({ sandpack: { listen: () => () => {} } }),
}));

vi.mock("@/components/PersistenceLoader", () => ({
	PersistenceLoader: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/modules/editor/EditorPane", () => ({
	EditorPane: () => <div>Editor</div>,
}));

vi.mock("@/modules/fs/FileTreePane", () => ({
	FileTreePane: () => <div>Files</div>,
}));

vi.mock("@/modules/preview/PreviewPane", () => ({
	PreviewPane: () => <div>Preview</div>,
}));

function configuredProviderCatalogResponse() {
	return Response.json({
		hostedChat: { enabled: true, tavilyConfigured: false },
		providers: [
			{
				id: "openai",
				name: "OpenAI",
				description: "OpenAI models",
				configured: true,
				missingEnvVars: [],
				defaultModelId: "openai/gpt-5.4",
				models: [
					{
						id: "openai/gpt-5.4",
						label: "GPT-5.4",
						description: "Default",
					},
				],
			},
		],
	});
}

describe("App layout", () => {
	beforeEach(() => {
		window.localStorage.setItem(TOUR_STORAGE_KEY, "true");
		useLayoutStore.setState({
			activeView: "preview",
			showChat: true,
			showConsole: false,
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.resolve(configuredProviderCatalogResponse())),
		);
	});

	it("preserves the chat draft while the panel is hidden", async () => {
		const user = userEvent.setup();
		render(<App />);

		const input = await screen.findByPlaceholderText(
			"Describe what you want to build…",
		);
		await user.type(input, "Keep this draft");
		await user.click(screen.getByRole("button", { name: "Hide chat panel" }));
		await user.click(screen.getByRole("button", { name: "Show chat panel" }));

		expect(
			screen.getByPlaceholderText("Describe what you want to build…"),
		).toHaveValue("Keep this draft");
	});

	it("starts the preview tour without switching to code mode", async () => {
		const user = userEvent.setup();
		render(<App />);
		await screen.findByPlaceholderText("Describe what you want to build…");

		await user.click(screen.getByRole("button", { name: "More actions" }));
		await user.click(
			await screen.findByRole("menuitem", { name: /feature tour/i }),
		);

		expect(useLayoutStore.getState().activeView).toBe("preview");
		await waitFor(() =>
			expect(screen.getByRole("heading", { name: "Chat Pane" })).toBeVisible(),
		);
		await user.click(screen.getByRole("button", { name: /next/i }));
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Code & Preview" }),
			).toBeVisible(),
		);
		await user.click(screen.getByRole("button", { name: /next/i }));
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Live Preview" }),
			).toBeVisible(),
		);
	});
});
