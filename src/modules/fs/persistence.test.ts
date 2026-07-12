import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
	clearWorkspace,
	flushScheduledWorkspaceSave,
	hasWorkspace,
	loadWorkspace,
	saveWorkspace,
	scheduleWorkspaceSave,
} from "@/modules/fs/persistence";
import type { VirtualFile } from "@/modules/fs/types";

const DB_NAME = "mini-lovable-db";

function deleteDatabase(): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(DB_NAME);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

describe("workspace persistence", () => {
	afterEach(async () => {
		await deleteDatabase();
	});

	it("round-trips virtual file status in a versioned document", async () => {
		const filesByPath: Record<string, VirtualFile> = {
			"/test.js": {
				path: "/test.js",
				content: "const modified = true;",
				status: "modified",
				originalContent: "const original = true;",
			},
		};

		await saveWorkspace(filesByPath);
		const loaded = await loadWorkspace();

		expect(loaded).toMatchObject({
			schemaVersion: 2,
			filesByPath,
			files: { "/test.js": "const modified = true;" },
			revision: expect.stringMatching(/^fnv1a64:/),
			timestamp: expect.any(Number),
		});
	});

	it("reports and clears persisted workspace state", async () => {
		expect(await hasWorkspace()).toBe(false);
		await saveWorkspace({});
		expect(await hasWorkspace()).toBe(true);

		await clearWorkspace();

		expect(await hasWorkspace()).toBe(false);
	});

	it("debounces edit persistence and flushes the latest state", async () => {
		scheduleWorkspaceSave({
			"/a.ts": { path: "/a.ts", content: "first", status: "modified" },
		});
		scheduleWorkspaceSave({
			"/a.ts": { path: "/a.ts", content: "latest", status: "modified" },
		});

		await flushScheduledWorkspaceSave();

		expect((await loadWorkspace())?.filesByPath["/a.ts"].content).toBe(
			"latest",
		);
	});

	it("cancels a delayed write when an explicit save commits newer state", async () => {
		scheduleWorkspaceSave(
			{
				"/a.ts": { path: "/a.ts", content: "stale", status: "modified" },
			},
			10,
		);
		await saveWorkspace({
			"/a.ts": { path: "/a.ts", content: "explicit", status: "modified" },
		});
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect((await loadWorkspace())?.filesByPath["/a.ts"].content).toBe(
			"explicit",
		);
	});
});
