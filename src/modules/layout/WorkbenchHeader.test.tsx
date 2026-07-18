import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useLayoutStore } from "@/modules/layout/store";
import { useThemeStore } from "@/modules/theme/store";
import { WorkbenchHeader } from "./WorkbenchHeader";

describe("WorkbenchHeader", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
		vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
			() => undefined,
		);
		useLayoutStore.setState({
			showChat: true,
			showConsole: false,
			activeView: "preview",
		});
		useThemeStore.setState({ mode: "night", resolvedTheme: "dark" });
	});

	afterAll(() => vi.restoreAllMocks());

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

	it("selects themes from a dedicated header menu", async () => {
		const user = userEvent.setup();
		render(<WorkbenchHeader />);

		const themeTrigger = screen.getByRole("button", { name: "Theme: Night" });
		const moreTrigger = screen.getByRole("button", { name: "More actions" });
		expect(themeTrigger.querySelector(".lucide-moon")).toBeInTheDocument();
		expect(
			themeTrigger.compareDocumentPosition(moreTrigger) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();

		await user.click(themeTrigger);

		const dayItem = await screen.findByRole("menuitemradio", { name: /day/i });
		const nightItem = screen.getByRole("menuitemradio", { name: /night/i });
		const summerItem = screen.getByRole("menuitemradio", { name: /summer/i });
		const drizzleItem = screen.getByRole("menuitemradio", {
			name: /drizzle/i,
		});
		const breezeItem = screen.getByRole("menuitemradio", { name: /breeze/i });

		expect(dayItem).toHaveTextContent("D");
		expect(dayItem.querySelector(".lucide-sun")).toBeInTheDocument();
		expect(nightItem).toHaveTextContent("N");
		expect(summerItem).toHaveTextContent("S");
		expect(summerItem.querySelector(".lucide-leaf")).toBeInTheDocument();
		expect(drizzleItem).toHaveTextContent("SoonR");
		expect(breezeItem).toHaveTextContent("SoonB");
		expect(nightItem).toHaveAttribute("aria-checked", "true");

		await user.click(summerItem);
		expect(useThemeStore.getState()).toMatchObject({
			mode: "summer",
			resolvedTheme: "light",
		});
		expect(
			screen
				.getByRole("button", { name: "Theme: Summer" })
				.querySelector(".lucide-leaf"),
		).toBeInTheDocument();

		await user.click(moreTrigger);
		expect(
			screen.queryByRole("menuitem", { name: /^theme/i }),
		).not.toBeInTheDocument();
	});

	it("uses single-letter theme shortcuts only outside editable surfaces", () => {
		render(<WorkbenchHeader />);

		for (const [key, mode] of [
			["d", "day"],
			["n", "night"],
			["s", "summer"],
			["r", "drizzle"],
			["B", "breeze"],
		] as const) {
			fireEvent.keyDown(window, { key, shiftKey: key === "B" });
			expect(useThemeStore.getState().mode).toBe(mode);
		}

		fireEvent.keyDown(window, { key: "d" });
		const input = document.createElement("input");
		const textarea = document.createElement("textarea");
		const select = document.createElement("select");
		const editable = document.createElement("div");
		const editableChild = document.createElement("span");
		const monaco = document.createElement("div");
		const monacoTextarea = document.createElement("textarea");
		editable.setAttribute("contenteditable", "true");
		editable.append(editableChild);
		monaco.className = "monaco-editor";
		monaco.append(monacoTextarea);
		document.body.append(input, textarea, select, editable, monaco);

		for (const target of [
			input,
			textarea,
			select,
			editableChild,
			monacoTextarea,
		]) {
			fireEvent.keyDown(target, { key: "n" });
			expect(useThemeStore.getState().mode).toBe("day");
		}

		fireEvent.keyDown(window, { key: "n", metaKey: true });
		fireEvent.keyDown(window, { key: "n", ctrlKey: true });
		fireEvent.keyDown(window, { key: "n", altKey: true });
		expect(useThemeStore.getState().mode).toBe("day");

		input.remove();
		textarea.remove();
		select.remove();
		editable.remove();
		monaco.remove();
	});
});
