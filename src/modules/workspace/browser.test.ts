import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFs } from "@/modules/fs/store";
import { browserWorkspace } from "@/modules/workspace/browser";

vi.mock("@/modules/fs/persistence", () => ({
	clearWorkspace: vi.fn().mockResolvedValue(undefined),
	loadWorkspace: vi.fn().mockResolvedValue(null),
	saveWorkspace: vi.fn().mockResolvedValue(undefined),
	scheduleWorkspaceSave: vi.fn(),
}));

describe("browser workspace mutation boundary", () => {
	beforeEach(async () => {
		await useFs.getState().resetFs();
	});

	it("serializes editor mutations after an Agent transaction without losing the edit", async () => {
		const path = "/src/App.js";
		const { snapshot } = await browserWorkspace.getSnapshot();
		const apply = browserWorkspace.apply({
			id: "agent-before-editor",
			baseRevision: snapshot.revision,
			summary: "Agent update",
			changes: [
				{
					op: "update",
					path,
					beforeHash: snapshot.files[path].hash,
					content: "agent content",
				},
			],
		});
		const edit = browserWorkspace.updateFileContent(path, "user content");

		expect((await apply).ok).toBe(true);
		await edit;
		expect(useFs.getState().filesByPath[path].content).toBe("user content");
	});

	it("turns an Agent transaction queued after an editor mutation into a conflict", async () => {
		const path = "/src/App.js";
		const { snapshot } = await browserWorkspace.getSnapshot();
		const edit = browserWorkspace.updateFileContent(path, "user content");
		const apply = browserWorkspace.apply({
			id: "editor-before-agent",
			baseRevision: snapshot.revision,
			summary: "Agent update",
			changes: [
				{
					op: "update",
					path,
					beforeHash: snapshot.files[path].hash,
					content: "agent content",
				},
			],
		});

		await edit;
		expect(await apply).toMatchObject({
			ok: false,
			code: "HASH_CONFLICT",
			failedPaths: [path],
		});
		expect(useFs.getState().filesByPath[path].content).toBe("user content");
	});

	it("reports invalid local paths as rejected mutations instead of synchronous throws", async () => {
		let mutation: Promise<void> | undefined;

		expect(() => {
			mutation = browserWorkspace.createFile("/src/../outside.ts", "unsafe");
		}).not.toThrow();
		await expect(mutation).rejects.toMatchObject({
			code: "INVALID_WORKSPACE_PATH",
		});
	});
});
