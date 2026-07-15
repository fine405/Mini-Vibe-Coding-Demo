import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "@/components/CommandPalette";

vi.mock("@/modules/workspace/browser", () => ({
	useBrowserWorkspaceFiles: () => ({
		"/src/App.tsx": {
			content: "",
			path: "/src/App.tsx",
			status: "clean",
		},
	}),
}));

vi.mock("@/modules/editor/store", () => ({
	useEditor: () => ({ openFile: vi.fn() }),
}));

describe("CommandPalette", () => {
	it("prioritizes matching files over actions while searching", () => {
		render(
			<CommandPalette
				isOpen
				onClose={vi.fn()}
				customActions={[
					{
						id: "open-app-settings",
						label: "Open app settings",
						action: vi.fn(),
					},
				]}
			/>,
		);

		fireEvent.change(
			screen.getByPlaceholderText("Type a command or search..."),
			{ target: { value: "app" } },
		);

		const fileResult = screen.getByText("/src/App.tsx");
		const actionResult = screen.getByText("Open app settings");

		expect(
			fileResult.compareDocumentPosition(actionResult) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});
});
