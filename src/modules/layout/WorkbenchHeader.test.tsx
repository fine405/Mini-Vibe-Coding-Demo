import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
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

	afterEach(() => {
		Reflect.deleteProperty(document, "fullscreenElement");
		Reflect.deleteProperty(document, "exitFullscreen");
		Reflect.deleteProperty(document.documentElement, "requestFullscreen");
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

	it("opens nested actions in a portal so they are not clipped by the parent menu", async () => {
		const user = userEvent.setup();
		render(<WorkbenchHeader />);

		await user.click(screen.getByRole("button", { name: "More actions" }));
		const parentMenu = screen
			.getByRole("menuitem", { name: /^import$/i })
			.closest<HTMLDivElement>('[data-slot="dropdown-menu-content"]');

		await user.hover(screen.getByRole("menuitem", { name: /^import$/i }));

		const importJsonItem = await screen.findByRole("menuitem", {
			name: /import json/i,
		});
		const nestedMenu = importJsonItem.closest<HTMLDivElement>(
			'[data-slot="dropdown-menu-sub-content"]',
		);
		expect(parentMenu).toBeInTheDocument();
		expect(nestedMenu).toBeInTheDocument();
		expect(parentMenu).not.toContainElement(nestedMenu);
	});

	it("toggles the console from the more menu", async () => {
		const user = userEvent.setup();
		render(<WorkbenchHeader />);

		await user.click(screen.getByRole("button", { name: "More actions" }));
		await user.click(await screen.findByRole("menuitem", { name: /console/i }));

		expect(useLayoutStore.getState().showConsole).toBe(true);
	});

	it("toggles fullscreen from the more menu and keyboard shortcut", async () => {
		let fullscreenElement: Element | null = null;
		const requestFullscreen = vi.fn().mockResolvedValue(undefined);
		const exitFullscreen = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(document, "fullscreenElement", {
			configurable: true,
			get: () => fullscreenElement,
		});
		Object.defineProperty(document, "exitFullscreen", {
			configurable: true,
			value: exitFullscreen,
		});
		Object.defineProperty(document.documentElement, "requestFullscreen", {
			configurable: true,
			value: requestFullscreen,
		});

		const user = userEvent.setup();
		render(<WorkbenchHeader />);

		await user.click(screen.getByRole("button", { name: "More actions" }));
		const enterFullscreenItem = await screen.findByRole("menuitem", {
			name: /enter full screen/i,
		});
		expect(enterFullscreenItem).toHaveTextContent("⌃⌘F");
		await user.click(enterFullscreenItem);
		expect(requestFullscreen).toHaveBeenCalledOnce();

		fullscreenElement = document.documentElement;
		fireEvent(document, new Event("fullscreenchange"));
		await user.click(screen.getByRole("button", { name: "More actions" }));
		await user.click(
			await screen.findByRole("menuitem", { name: /exit full screen/i }),
		);
		expect(exitFullscreen).toHaveBeenCalledOnce();

		fullscreenElement = null;
		fireEvent(document, new Event("fullscreenchange"));
		fireEvent.keyDown(window, { key: "f", ctrlKey: true, metaKey: true });
		expect(requestFullscreen).toHaveBeenCalledTimes(2);
	});

	it("selects themes from a dedicated header menu", async () => {
		const user = userEvent.setup();
		render(<WorkbenchHeader />);

		const themeTrigger = screen.getByRole("button", { name: "Theme: Night" });
		const moreTrigger = screen.getByRole("button", { name: "More actions" });
		expect(themeTrigger.querySelector(".lucide-moon")).toBeInTheDocument();
		expect(themeTrigger).toHaveClass(
			"focus-visible:border-transparent!",
			"focus-visible:ring-0!",
			"focus-visible:bg-bg-tertiary",
		);
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
		const snowItem = screen.getByRole("menuitemradio", { name: /snow/i });

		expect(dayItem).toHaveTextContent("D");
		expect(dayItem.querySelector(".lucide-sun")).toBeInTheDocument();
		expect(nightItem).toHaveTextContent("N");
		expect(summerItem).toHaveTextContent("S");
		expect(summerItem.querySelector(".lucide-leaf")).toBeInTheDocument();
		expect(drizzleItem).toHaveTextContent("R");
		expect(drizzleItem).not.toHaveTextContent("Soon");
		expect(breezeItem).toHaveTextContent("SoonB");
		expect(snowItem).toHaveTextContent("SoonW");
		expect(snowItem.querySelector(".lucide-snowflake")).toBeInTheDocument();
		expect(screen.getAllByRole("menuitemradio").at(-1)).toBe(breezeItem);
		expect(nightItem).toHaveAttribute("aria-checked", "true");

		await user.click(snowItem);
		expect(useThemeStore.getState()).toMatchObject({
			mode: "snow",
			resolvedTheme: "light",
		});
		expect(
			screen
				.getByRole("button", { name: "Theme: Snow" })
				.querySelector(".lucide-snowflake"),
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
			["w", "snow"],
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

	it("ignores theme shortcuts while Monaco reports editor focus", () => {
		render(<WorkbenchHeader />);
		const monaco = document.createElement("div");
		const editorFocusTarget = document.createElement("div");
		editorFocusTarget.tabIndex = 0;
		monaco.append(editorFocusTarget);
		monaco.className = "monaco-editor focused";
		document.body.append(monaco);

		fireEvent.keyDown(window, { key: "d" });
		expect(useThemeStore.getState().mode).toBe("night");

		monaco.classList.remove("focused");
		editorFocusTarget.focus();
		fireEvent.keyDown(window, { key: "d" });
		expect(useThemeStore.getState().mode).toBe("night");

		editorFocusTarget.blur();
		fireEvent.keyDown(window, { key: "d" });
		expect(useThemeStore.getState().mode).toBe("day");
		monaco.remove();
	});
});
