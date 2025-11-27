import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFs } from "./store";

// Mock persistence module
vi.mock("./persistence", () => ({
	saveWorkspace: vi.fn().mockResolvedValue(undefined),
	loadWorkspace: vi.fn().mockResolvedValue(null),
	clearWorkspace: vi.fn().mockResolvedValue(undefined),
}));

describe("fs store", () => {
	beforeEach(() => {
		// Reset store to initial state
		useFs.getState().resetFs();
	});

	describe("updateFileContent", () => {
		it("should store originalContent on first modification", () => {
			const path = "/App.js";
			const originalContent = useFs.getState().filesByPath[path].content;

			useFs.getState().updateFileContent(path, "modified content");

			const file = useFs.getState().filesByPath[path];
			expect(file.content).toBe("modified content");
			expect(file.status).toBe("modified");
			expect(file.originalContent).toBe(originalContent);
		});

		it("should not overwrite originalContent on subsequent modifications", () => {
			const path = "/App.js";
			const originalContent = useFs.getState().filesByPath[path].content;

			useFs.getState().updateFileContent(path, "first modification");
			useFs.getState().updateFileContent(path, "second modification");

			const file = useFs.getState().filesByPath[path];
			expect(file.content).toBe("second modification");
			expect(file.originalContent).toBe(originalContent);
		});
	});

	describe("revertFile", () => {
		it("should restore original content and set status to clean", () => {
			const path = "/App.js";
			const originalContent = useFs.getState().filesByPath[path].content;

			useFs.getState().updateFileContent(path, "modified content");
			useFs.getState().revertFile(path);

			const file = useFs.getState().filesByPath[path];
			expect(file.content).toBe(originalContent);
			expect(file.status).toBe("clean");
			expect(file.originalContent).toBeUndefined();
		});

		it("should do nothing for clean files", () => {
			const path = "/App.js";
			const originalContent = useFs.getState().filesByPath[path].content;

			useFs.getState().revertFile(path);

			const file = useFs.getState().filesByPath[path];
			expect(file.content).toBe(originalContent);
			expect(file.status).toBe("clean");
		});

		it("should do nothing for new files", () => {
			useFs.getState().createFile("/new.js", "new file content");

			useFs.getState().revertFile("/new.js");

			const file = useFs.getState().filesByPath["/new.js"];
			expect(file.content).toBe("new file content");
			expect(file.status).toBe("new");
		});
	});

	describe("acceptAllChanges", () => {
		it("should clear originalContent when accepting changes", () => {
			const path = "/App.js";

			useFs.getState().updateFileContent(path, "modified content");
			expect(useFs.getState().filesByPath[path].originalContent).toBeDefined();

			useFs.getState().acceptAllChanges();

			const file = useFs.getState().filesByPath[path];
			expect(file.status).toBe("clean");
			expect(file.originalContent).toBeUndefined();
		});
	});

	describe("revertAllChanges", () => {
		it("should revert all modified files to their original content", () => {
			const path1 = "/App.js";
			const path2 = "/index.js";
			const originalContent1 = useFs.getState().filesByPath[path1].content;
			const originalContent2 = useFs.getState().filesByPath[path2].content;

			useFs.getState().updateFileContent(path1, "modified App.js");
			useFs.getState().updateFileContent(path2, "modified index.js");

			useFs.getState().revertAllChanges();

			const file1 = useFs.getState().filesByPath[path1];
			const file2 = useFs.getState().filesByPath[path2];
			expect(file1.content).toBe(originalContent1);
			expect(file1.status).toBe("clean");
			expect(file1.originalContent).toBeUndefined();
			expect(file2.content).toBe(originalContent2);
			expect(file2.status).toBe("clean");
			expect(file2.originalContent).toBeUndefined();
		});

		it("should delete new files", () => {
			useFs.getState().createFile("/new.js", "new file content");
			useFs.getState().updateFileContent("/App.js", "modified App.js");

			useFs.getState().revertAllChanges();

			expect(useFs.getState().filesByPath["/new.js"]).toBeUndefined();
		});

		it("should not affect clean files", () => {
			const path = "/App.js";
			const originalContent = useFs.getState().filesByPath[path].content;

			useFs.getState().revertAllChanges();

			const file = useFs.getState().filesByPath[path];
			expect(file.content).toBe(originalContent);
			expect(file.status).toBe("clean");
		});
	});

	describe("getModifiedFiles", () => {
		it("should return list of modified file paths", () => {
			useFs.getState().updateFileContent("/App.js", "modified App.js");
			useFs.getState().updateFileContent("/index.js", "modified index.js");

			const modifiedFiles = useFs.getState().getModifiedFiles();

			expect(modifiedFiles).toContain("/App.js");
			expect(modifiedFiles).toContain("/index.js");
			expect(modifiedFiles.length).toBe(2);
		});

		it("should include new files", () => {
			useFs.getState().createFile("/new.js", "new file content");
			useFs.getState().updateFileContent("/App.js", "modified App.js");

			const modifiedFiles = useFs.getState().getModifiedFiles();

			expect(modifiedFiles).toContain("/App.js");
			expect(modifiedFiles).toContain("/new.js");
			expect(modifiedFiles.length).toBe(2);
		});

		it("should return empty array when no files are modified", () => {
			const modifiedFiles = useFs.getState().getModifiedFiles();
			expect(modifiedFiles.length).toBe(0);
		});
	});
});
