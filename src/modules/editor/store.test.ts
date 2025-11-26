import { beforeEach, describe, expect, it } from "vitest";
import { useEditor } from "./store";

describe("editor store", () => {
	beforeEach(() => {
		// Reset store state before each test
		useEditor.setState({
			openFiles: [],
			activeFilePath: null,
		});
	});

	describe("openFile", () => {
		it("should add file to openFiles and set as active", () => {
			useEditor.getState().openFile("/test.ts");

			const state = useEditor.getState();
			expect(state.openFiles).toHaveLength(1);
			expect(state.openFiles[0].path).toBe("/test.ts");
			expect(state.openFiles[0].viewMode).toBe("editor");
			expect(state.activeFilePath).toBe("/test.ts");
		});

		it("should not duplicate already open files", () => {
			useEditor.getState().openFile("/test.ts");
			useEditor.getState().openFile("/test.ts");

			const state = useEditor.getState();
			expect(state.openFiles).toHaveLength(1);
		});

		it("should open multiple files", () => {
			useEditor.getState().openFile("/a.ts");
			useEditor.getState().openFile("/b.ts");
			useEditor.getState().openFile("/c.ts");

			const state = useEditor.getState();
			expect(state.openFiles).toHaveLength(3);
			expect(state.activeFilePath).toBe("/c.ts");
		});
	});

	describe("closeFile", () => {
		it("should remove file from openFiles", () => {
			useEditor.getState().openFile("/a.ts");
			useEditor.getState().openFile("/b.ts");
			useEditor.getState().closeFile("/a.ts");

			const state = useEditor.getState();
			expect(state.openFiles).toHaveLength(1);
			expect(state.openFiles[0].path).toBe("/b.ts");
		});

		it("should switch to next tab when closing active file", () => {
			useEditor.getState().openFile("/a.ts");
			useEditor.getState().openFile("/b.ts");
			useEditor.getState().openFile("/c.ts");
			useEditor.getState().setActiveFile("/b.ts");
			useEditor.getState().closeFile("/b.ts");

			const state = useEditor.getState();
			expect(state.activeFilePath).toBe("/c.ts");
		});

		it("should set activeFilePath to null when closing last file", () => {
			useEditor.getState().openFile("/test.ts");
			useEditor.getState().closeFile("/test.ts");

			const state = useEditor.getState();
			expect(state.openFiles).toHaveLength(0);
			expect(state.activeFilePath).toBeNull();
		});
	});

	describe("toggleViewMode", () => {
		it("should toggle between editor and diff", () => {
			useEditor.getState().openFile("/test.ts");

			useEditor.getState().toggleViewMode("/test.ts");
			expect(useEditor.getState().openFiles[0].viewMode).toBe("diff");

			useEditor.getState().toggleViewMode("/test.ts");
			expect(useEditor.getState().openFiles[0].viewMode).toBe("editor");
		});
	});

	describe("setViewMode", () => {
		it("should set specific view mode", () => {
			useEditor.getState().openFile("/test.ts");

			useEditor.getState().setViewMode("/test.ts", "diff");
			expect(useEditor.getState().openFiles[0].viewMode).toBe("diff");

			useEditor.getState().setViewMode("/test.ts", "editor");
			expect(useEditor.getState().openFiles[0].viewMode).toBe("editor");
		});
	});

	describe("closeAllFiles", () => {
		it("should close all files and reset active", () => {
			useEditor.getState().openFile("/a.ts");
			useEditor.getState().openFile("/b.ts");
			useEditor.getState().closeAllFiles();

			const state = useEditor.getState();
			expect(state.openFiles).toHaveLength(0);
			expect(state.activeFilePath).toBeNull();
		});
	});
});
