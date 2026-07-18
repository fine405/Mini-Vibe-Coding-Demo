import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useLayoutStore } from "@/modules/layout/store";
import { WorkbenchHeader } from "./WorkbenchHeader";

describe("WorkbenchHeader", () => {
	beforeEach(() => {
		useLayoutStore.setState({
			showChat: true,
			showConsole: false,
			activeView: "preview",
		});
	});

	it("switches the workbench view via the tabs", async () => {
		const user = userEvent.setup();
		render(<WorkbenchHeader />);

		const codeTab = screen.getByRole("tab", { name: /code/i });
		const previewTab = screen.getByRole("tab", { name: /preview/i });
		expect(previewTab).toHaveAttribute("aria-selected", "true");

		await user.click(codeTab);
		expect(useLayoutStore.getState().activeView).toBe("code");
		expect(screen.getByRole("tab", { name: /code/i })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	it("only shows the chat toggle when the chat panel is hidden", () => {
		const { rerender } = render(<WorkbenchHeader />);
		expect(
			screen.queryByRole("button", { name: "Show chat panel" }),
		).not.toBeInTheDocument();

		useLayoutStore.setState({ showChat: false });
		rerender(<WorkbenchHeader />);
		expect(
			screen.getByRole("button", { name: "Show chat panel" }),
		).toBeInTheDocument();
	});

	it("collects secondary actions in the more menu with a subtle console shortcut", async () => {
		const user = userEvent.setup();
		render(<WorkbenchHeader />);

		await user.click(screen.getByRole("button", { name: "More actions" }));

		expect(
			await screen.findByRole("menuitem", { name: /new project/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("menuitem", { name: /import/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("menuitem", { name: /export/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("menuitem", { name: /feature tour/i }),
		).toBeInTheDocument();

		const consoleItem = screen.getByRole("menuitem", { name: /console/i });
		expect(consoleItem).toHaveTextContent("⌘2");
	});

	it("toggles the console from the more menu", async () => {
		const user = userEvent.setup();
		render(<WorkbenchHeader />);

		await user.click(screen.getByRole("button", { name: "More actions" }));
		await user.click(await screen.findByRole("menuitem", { name: /console/i }));

		expect(useLayoutStore.getState().showConsole).toBe(true);
	});
});
