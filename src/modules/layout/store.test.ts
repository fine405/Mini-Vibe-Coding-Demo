import { describe, expect, it } from "vitest";
import { useLayoutStore } from "./store";

describe("Layout Store", () => {
	it("should toggle chat visibility", () => {
		const store = useLayoutStore.getState();
		// Initial state
		expect(store.showChat).toBe(true);

		store.toggleChat();
		expect(useLayoutStore.getState().showChat).toBe(false);

		store.toggleChat();
		expect(useLayoutStore.getState().showChat).toBe(true);
	});

	it("should toggle console visibility", () => {
		const store = useLayoutStore.getState();
		// Initial state
		expect(store.showConsole).toBe(true);

		store.toggleConsole();
		expect(useLayoutStore.getState().showConsole).toBe(false);

		store.toggleConsole();
		expect(useLayoutStore.getState().showConsole).toBe(true);
	});

	it("should set specific visibility", () => {
		const store = useLayoutStore.getState();

		store.setChatVisible(false);
		expect(useLayoutStore.getState().showChat).toBe(false);

		store.setConsoleVisible(false);
		expect(useLayoutStore.getState().showConsole).toBe(false);
	});
});
