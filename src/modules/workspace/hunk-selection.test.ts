import { describe, expect, it } from "vitest";
import { loadWorkspaceChangeHunks } from "@/modules/workspace/hunk-selection";
import { createMemoryWorkspace } from "@/modules/workspace/workspace";

describe("Workspace hunk selection", () => {
	it("applies selected hunks as one validated Workspace transaction", async () => {
		const before = Array.from(
			{ length: 24 },
			(_, index) => `line-${index + 1}`,
		).join("\n");
		const after = before
			.replace("line-2", "line-2-updated")
			.replace("line-22", "line-22-updated");
		const workspace = createMemoryWorkspace({ "/src/example.ts": before });
		const { snapshot } = await workspace.getSnapshot();
		const changeSet = {
			id: "agent:partial",
			baseRevision: snapshot.revision,
			summary: "Update two independent regions",
			changes: [
				{
					op: "update" as const,
					path: "/src/example.ts",
					beforeHash: snapshot.files["/src/example.ts"].hash,
					content: after,
				},
			],
		};
		const hunks = await loadWorkspaceChangeHunks(changeSet, {
			"/src/example.ts": before,
		});

		expect(hunks[0].hunks).toHaveLength(2);
		const result = await workspace.apply(changeSet, {
			hunkIndicesByChange: { 0: [hunks[0].hunks[0].index] },
		});

		expect(result.ok).toBe(true);
		const content = (await workspace.getSnapshot()).snapshot.files[
			"/src/example.ts"
		].content;
		expect(content).toContain("line-2-updated");
		expect(content).toContain("line-22\n");
		expect(content).not.toContain("line-22-updated");
	});

	it("rejects an empty hunk selection without mutating files", async () => {
		const workspace = createMemoryWorkspace({ "/old.ts": "old" });
		const { snapshot } = await workspace.getSnapshot();
		const result = await workspace.apply(
			{
				id: "agent:none",
				baseRevision: snapshot.revision,
				summary: "No selected changes",
				changes: [
					{
						op: "delete",
						path: "/old.ts",
						beforeHash: snapshot.files["/old.ts"].hash,
					},
				],
			},
			{ hunkIndicesByChange: { 0: [] } },
		);

		expect(result).toEqual({
			ok: false,
			code: "INVALID_CHANGESET",
			message: "At least one change hunk must be selected",
			failedPaths: [],
		});
		expect((await workspace.getSnapshot()).snapshot).toEqual(snapshot);
	});
});
