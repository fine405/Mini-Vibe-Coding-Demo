import { beforeEach, describe, expect, it } from "vitest";
import { useLayoutStore } from "@/modules/layout/store";

describe("Layout Store", () => {
	beforeEach(() => {
		useLayoutStore.setState({
			showChat: true,
			showConsole: false,
			activeView: "preview",
		});
	});

	it("should toggle chat visibility", () => {
		const store = useLayoutStore.getState();
		// Initial state
		expect(store.showChat).toBe(true);

		store.toggleChat();
		expect(useLayoutStore.getState().showChat).toBe(false);

		store.toggleChat();
		expect(useLayoutStore.getState().showChat).toBe(true);
	});

	it("should toggle console visibility, closed by default", () => {
		const store = useLayoutStore.getState();
		// Console starts closed
		expect(store.showConsole).toBe(false);

		store.toggleConsole();
		expect(useLayoutStore.getState().showConsole).toBe(true);

		store.toggleConsole();
		expect(useLayoutStore.getState().showConsole).toBe(false);
	});

	it("should set specific visibility", () => {
		const store = useLayoutStore.getState();

		store.setChatVisible(false);
		expect(useLayoutStore.getState().showChat).toBe(false);

		store.setConsoleVisible(true);
		expect(useLayoutStore.getState().showConsole).toBe(true);
	});

	it("should switch the workbench view, preview by default", () => {
		const store = useLayoutStore.getState();
		expect(store.activeView).toBe("preview");

		store.setActiveView("code");
		expect(useLayoutStore.getState().activeView).toBe("code");

		store.setActiveView("preview");
		expect(useLayoutStore.getState().activeView).toBe("preview");
	});
});
