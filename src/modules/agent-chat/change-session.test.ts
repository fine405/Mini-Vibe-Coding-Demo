import { beforeEach, describe, expect, it } from "vitest";
import {
	type CompletedAgentToolResult,
	selectReviewableAgentPaths,
	useAgentChangeSessionStore,
} from "@/modules/agent-chat/change-session";
import { createWorkspaceSnapshot, hashText } from "@/modules/workspace/domain";

function completedWrite(
	path: string,
	content: string,
): CompletedAgentToolResult {
	return {
		toolName: "write_file",
		input: { path, content },
		output: {
			path,
			hash: hashText(content),
			bytes: new TextEncoder().encode(content).byteLength,
		},
	};
}

function completedDelete(path: string): CompletedAgentToolResult {
	return {
		toolName: "delete_file",
		input: { path },
		output: { path, deleted: true },
	};
}

function completedFinalize(output: unknown): CompletedAgentToolResult {
	return {
		toolName: "finalize_changes",
		input: { summary: "Finish the change" },
		output,
	};
}

describe("Agent change session", () => {
	beforeEach(() => {
		useAgentChangeSessionStore.getState().clear();
	});

	it("projects a completed write against the run snapshot", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/App.ts": "export const value = 'before';\n",
		});
		useAgentChangeSessionStore.getState().begin(snapshot);

		const result = useAgentChangeSessionStore
			.getState()
			.projectToolResult(
				completedWrite("/src/App.ts", "export const value = 'after';\n"),
			);

		expect(result).toEqual({ accepted: true, openedPath: "/src/App.ts" });
		expect(useAgentChangeSessionStore.getState()).toMatchObject({
			phase: "running",
			activePath: "/src/App.ts",
			orderedPaths: ["/src/App.ts"],
			changesByPath: {
				"/src/App.ts": {
					op: "update",
					path: "/src/App.ts",
					originalContent: "export const value = 'before';\n",
					content: "export const value = 'after';\n",
				},
			},
		});
	});

	it("removes a projected change when the Agent writes the base content back", () => {
		const before = "export const value = 'before';\n";
		const { snapshot } = createWorkspaceSnapshot({ "/src/App.ts": before });
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult(
			completedWrite("/src/App.ts", "export const value = 'after';\n"),
		);

		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/App.ts", before));

		const state = useAgentChangeSessionStore.getState();
		expect(state.changesByPath).toEqual({});
		expect(state.activePath).toBeNull();
	});

	it("keeps the latest repeated write at the path's original position", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/a.ts": "a-before\n",
			"/src/b.ts": "b-before\n",
		});
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult(completedWrite("/src/a.ts", "a-first\n"));
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/b.ts", "b-after\n"));
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/a.ts", "a-latest\n"));

		const state = useAgentChangeSessionStore.getState();
		expect(state.orderedPaths).toEqual(["/src/a.ts", "/src/b.ts"]);
		expect(state.changesByPath["/src/a.ts"].content).toBe("a-latest\n");
		expect(state.activePath).toBe("/src/a.ts");
	});

	it("ignores write output that does not validate against its input", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/App.ts": "before\n",
		});
		useAgentChangeSessionStore.getState().begin(snapshot);

		const result = useAgentChangeSessionStore.getState().projectToolResult({
			...completedWrite("/src/App.ts", "after\n"),
			output: {
				path: "/src/App.ts",
				hash: hashText("different content\n"),
				bytes: 6,
			},
		});

		expect(result).toEqual({ accepted: false });
		expect(useAgentChangeSessionStore.getState().changesByPath).toEqual({});
	});

	it("projects a completed delete without removing the base content", () => {
		const before = "export const value = true;\n";
		const { snapshot } = createWorkspaceSnapshot({ "/src/old.ts": before });
		useAgentChangeSessionStore.getState().begin(snapshot);

		const result = useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedDelete("/src/old.ts"));

		expect(result).toEqual({ accepted: true, openedPath: "/src/old.ts" });
		expect(
			useAgentChangeSessionStore.getState().changesByPath["/src/old.ts"],
		).toEqual({
			op: "delete",
			path: "/src/old.ts",
			originalContent: before,
			content: "",
		});
		expect(useAgentChangeSessionStore.getState().baseFiles["/src/old.ts"]).toBe(
			before,
		);
	});

	it("removes a newly created draft when the Agent deletes it", () => {
		const { snapshot } = createWorkspaceSnapshot({});
		useAgentChangeSessionStore.getState().begin(snapshot);
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/new.ts", "new content\n"));

		const result = useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedDelete("/src/new.ts"));

		expect(result).toEqual({ accepted: true });
		const state = useAgentChangeSessionStore.getState();
		expect(state.changesByPath).toEqual({});
		expect(state.activePath).toBeNull();
	});

	it("reconciles projected files to the finalized ChangeSet", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/a.ts": "a-before\n",
			"/src/b.ts": "b-before\n",
		});
		useAgentChangeSessionStore.getState().begin(snapshot);
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/a.ts", "a-intermediate\n"));
		const changeSet = {
			id: "agent:final",
			baseRevision: snapshot.revision,
			summary: "Finish the change",
			changes: [
				{
					op: "update" as const,
					path: "/src/a.ts",
					beforeHash: snapshot.files["/src/a.ts"].hash,
					content: "a-final\n",
				},
				{
					op: "delete" as const,
					path: "/src/b.ts",
					beforeHash: snapshot.files["/src/b.ts"].hash,
				},
				{
					op: "create" as const,
					path: "/src/c.ts",
					beforeHash: null,
					content: "c-new\n",
				},
			],
		};

		const result = useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedFinalize(changeSet));

		expect(result).toEqual({ accepted: true });
		const state = useAgentChangeSessionStore.getState();
		expect(state.phase).toBe("finalized");
		expect(state.changeSet).toEqual(changeSet);
		expect(state.orderedPaths).toEqual(["/src/a.ts", "/src/b.ts", "/src/c.ts"]);
		expect(state.changesByPath).toEqual({
			"/src/a.ts": {
				op: "update",
				path: "/src/a.ts",
				originalContent: "a-before\n",
				content: "a-final\n",
			},
			"/src/b.ts": {
				op: "delete",
				path: "/src/b.ts",
				originalContent: "b-before\n",
				content: "",
			},
			"/src/c.ts": {
				op: "create",
				path: "/src/c.ts",
				originalContent: "",
				content: "c-new\n",
			},
		});
	});

	it("rejects a finalized ChangeSet with an invalid workspace path", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/App.ts": "before\n",
		});
		useAgentChangeSessionStore.getState().begin(snapshot);

		const result = useAgentChangeSessionStore.getState().projectToolResult(
			completedFinalize({
				id: "agent:invalid-path",
				baseRevision: snapshot.revision,
				summary: "Invalid path",
				changes: [
					{
						op: "create",
						path: "/src/../outside.ts",
						beforeHash: null,
						content: "nope\n",
					},
				],
			}),
		);

		expect(result).toEqual({ accepted: false });
		expect(useAgentChangeSessionStore.getState().phase).toBe("running");
	});

	it("keeps a discarded path hidden across later writes in the same run", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/a.ts": "a-before\n",
			"/src/b.ts": "b-before\n",
		});
		useAgentChangeSessionStore.getState().begin(snapshot);
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/a.ts", "a-after\n"));
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/b.ts", "b-after\n"));

		const nextPath = useAgentChangeSessionStore
			.getState()
			.discardPath("/src/a.ts");
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/a.ts", "a-later\n"));

		const state = useAgentChangeSessionStore.getState();
		expect(nextPath).toBe("/src/b.ts");
		expect(state.activePath).toBe("/src/b.ts");
		expect(state.discardedPaths).toEqual(["/src/a.ts"]);
		expect(selectReviewableAgentPaths(state)).toEqual(["/src/b.ts"]);
		expect(state.changesByPath["/src/a.ts"].content).toBe("a-later\n");
	});

	it("does not reopen a discarded path when it is written again", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/a.ts": "a-before\n",
			"/src/b.ts": "b-before\n",
		});
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult(completedWrite("/src/a.ts", "a-after\n"));
		useAgentChangeSessionStore.getState().discardPath("/src/a.ts");

		const result = useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/a.ts", "a-later\n"));

		const state = useAgentChangeSessionStore.getState();
		expect(result).toEqual({ accepted: true });
		expect(state.activePath).toBeNull();
		expect(selectReviewableAgentPaths(state)).toEqual([]);

		const laterFile = useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/b.ts", "b-after\n"));
		expect(laterFile).toEqual({ accepted: true });
		expect(useAgentChangeSessionStore.getState().activePath).toBe("/src/b.ts");
	});

	it("shares discarded files with finalized review selections", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/a.ts": "a-before\n",
			"/src/b.ts": "b-before\n",
		});
		const changeSet = {
			id: "agent:selection",
			baseRevision: snapshot.revision,
			summary: "Update two files",
			changes: [
				{
					op: "update" as const,
					path: "/src/a.ts",
					beforeHash: snapshot.files["/src/a.ts"].hash,
					content: "a-after\n",
				},
				{
					op: "update" as const,
					path: "/src/b.ts",
					beforeHash: snapshot.files["/src/b.ts"].hash,
					content: "b-after\n",
				},
			],
		};
		useAgentChangeSessionStore.getState().begin(snapshot);
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/a.ts", "a-after\n"));
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/b.ts", "b-after\n"));
		useAgentChangeSessionStore.getState().discardPath("/src/a.ts");
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedFinalize(changeSet));

		useAgentChangeSessionStore
			.getState()
			.initializeReviewSelections(changeSet.id, { 0: [0, 1], 1: [0] });

		let state = useAgentChangeSessionStore.getState();
		expect(state.reviewSelections).toEqual({ 0: [], 1: [0] });
		expect(selectReviewableAgentPaths(state)).toEqual(["/src/b.ts"]);

		useAgentChangeSessionStore
			.getState()
			.setReviewSelections(changeSet.id, { 0: [1], 1: [] });

		state = useAgentChangeSessionStore.getState();
		expect(state.discardedPaths).toEqual(["/src/b.ts"]);
		expect(selectReviewableAgentPaths(state)).toEqual(["/src/a.ts"]);
		expect(state.activePath).toBe("/src/a.ts");
	});

	it("updates finalized review selections when a file is discarded in the editor", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/a.ts": "a-before\n",
			"/src/b.ts": "b-before\n",
		});
		const changeSet = {
			id: "agent:editor-discard",
			baseRevision: snapshot.revision,
			summary: "Update two files",
			changes: [
				{
					op: "update" as const,
					path: "/src/a.ts",
					beforeHash: snapshot.files["/src/a.ts"].hash,
					content: "a-after\n",
				},
				{
					op: "update" as const,
					path: "/src/b.ts",
					beforeHash: snapshot.files["/src/b.ts"].hash,
					content: "b-after\n",
				},
			],
		};
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult(completedFinalize(changeSet));
		useAgentChangeSessionStore
			.getState()
			.initializeReviewSelections(changeSet.id, { 0: [0], 1: [0, 1] });

		const nextPath = useAgentChangeSessionStore
			.getState()
			.discardPath("/src/a.ts");

		const state = useAgentChangeSessionStore.getState();
		expect(nextPath).toBe("/src/b.ts");
		expect(state.reviewSelections).toEqual({ 0: [], 1: [0, 1] });
	});

	it("only activates a path that is still reviewable", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/a.ts": "a-before\n",
			"/src/b.ts": "b-before\n",
		});
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult(completedWrite("/src/a.ts", "a-after\n"));
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite("/src/b.ts", "b-after\n"));
		useAgentChangeSessionStore.getState().discardPath("/src/a.ts");

		expect(
			useAgentChangeSessionStore.getState().setActivePath("/src/a.ts"),
		).toBe(false);
		expect(
			useAgentChangeSessionStore.getState().setActivePath("/src/b.ts"),
		).toBe(true);
		expect(useAgentChangeSessionStore.getState().activePath).toBe("/src/b.ts");
	});

	it("clears projections immediately when discard all is requested", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/App.ts": "before\n",
		});
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult(completedWrite("/src/App.ts", "after\n"));

		useAgentChangeSessionStore.getState().requestDiscardAll();

		expect(useAgentChangeSessionStore.getState()).toMatchObject({
			phase: "idle",
			changesByPath: {},
			discardAllRequested: true,
		});
	});
});
