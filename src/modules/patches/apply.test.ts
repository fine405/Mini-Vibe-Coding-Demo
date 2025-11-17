import { describe, expect, it } from "vitest";
import type { VirtualFile } from "../fs/types";
import { applyChange } from "./apply";
import type { PatchChange } from "./types";

describe("Patch Application", () => {
	it("should create a new file", () => {
		const filesByPath: Record<string, VirtualFile> = {};
		const change: PatchChange = {
			op: "create",
			path: "/test.js",
			content: "console.log('hello');",
		};

		const result = applyChange(filesByPath, change);

		expect(result["/test.js"]).toBeDefined();
		expect(result["/test.js"].content).toBe("console.log('hello');");
		expect(result["/test.js"].status).toBe("new");
	});

	it("should update an existing file", () => {
		const filesByPath: Record<string, VirtualFile> = {
			"/test.js": {
				path: "/test.js",
				content: "console.log('old');",
				status: "clean",
			},
		};
		const change: PatchChange = {
			op: "update",
			path: "/test.js",
			content: "console.log('new');",
		};

		const result = applyChange(filesByPath, change);

		expect(result["/test.js"].content).toBe("console.log('new');");
		expect(result["/test.js"].status).toBe("modified");
	});

	it("should delete a file", () => {
		const filesByPath: Record<string, VirtualFile> = {
			"/test.js": {
				path: "/test.js",
				content: "console.log('test');",
				status: "clean",
			},
			"/keep.js": {
				path: "/keep.js",
				content: "console.log('keep');",
				status: "clean",
			},
		};
		const change: PatchChange = {
			op: "delete",
			path: "/test.js",
		};

		const result = applyChange(filesByPath, change);

		expect(result["/test.js"]).toBeUndefined();
		expect(result["/keep.js"]).toBeDefined();
	});

	it("should apply range-based update", () => {
		const filesByPath: Record<string, VirtualFile> = {
			"/test.js": {
				path: "/test.js",
				content: "line 1\nline 2\nline 3\nline 4\nline 5",
				status: "clean",
			},
		};
		const change: PatchChange = {
			op: "update",
			path: "/test.js",
			patch: {
				type: "replace-range",
				startLine: 2,
				endLine: 3,
				content: "new line 2\nnew line 3",
			},
		};

		const result = applyChange(filesByPath, change);

		expect(result["/test.js"].content).toBe(
			"line 1\nnew line 2\nnew line 3\nline 4\nline 5",
		);
		expect(result["/test.js"].status).toBe("modified");
	});

	it("should handle multiple operations in sequence", () => {
		let filesByPath: Record<string, VirtualFile> = {};

		// Create
		const create: PatchChange = {
			op: "create",
			path: "/app.js",
			content: "const x = 1;",
		};
		filesByPath = applyChange(filesByPath, create);
		expect(filesByPath["/app.js"]).toBeDefined();

		// Update
		const update: PatchChange = {
			op: "update",
			path: "/app.js",
			content: "const x = 2;",
		};
		filesByPath = applyChange(filesByPath, update);
		expect(filesByPath["/app.js"].content).toBe("const x = 2;");

		// Delete
		const del: PatchChange = {
			op: "delete",
			path: "/app.js",
		};
		filesByPath = applyChange(filesByPath, del);
		expect(filesByPath["/app.js"]).toBeUndefined();
	});
});
