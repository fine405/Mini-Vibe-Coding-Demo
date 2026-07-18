import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangeSetReview } from "@/modules/agent-chat/ChangeSetReview";
import { useAgentChangeSessionStore } from "@/modules/agent-chat/change-session";
import { EditorPane } from "@/modules/editor/EditorPane";
import { useEditor } from "@/modules/editor/store";
import { useFs } from "@/modules/fs/store";
import { browserWorkspace } from "@/modules/workspace/browser";
import type {
	WorkspaceChangeSet,
	WorkspaceSnapshot,
} from "@/modules/workspace/types";

vi.mock("@/modules/fs/persistence", () => ({
	clearWorkspace: vi.fn().mockResolvedValue(undefined),
	loadWorkspace: vi.fn().mockResolvedValue(null),
	saveWorkspace: vi.fn().mockResolvedValue(undefined),
	scheduleWorkspaceSave: vi.fn(),
}));

describe("ChangeSetReview", () => {
	beforeEach(async () => {
		await useFs.getState().resetFs();
		useEditor.getState().closeAllFiles();
		useAgentChangeSessionStore.getState().clear();
	});

	function finalizeSession(
		snapshot: WorkspaceSnapshot,
		changeSet: WorkspaceChangeSet,
	) {
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult({
			toolName: "finalize_changes",
			input: { summary: changeSet.summary },
			output: changeSet,
		});
	}

	it("applies an approved ChangeSet through Workspace and can undo it", async () => {
		const user = userEvent.setup();
		const before = useFs.getState().filesByPath["/src/App.js"].content;
		const { snapshot } = await browserWorkspace.getSnapshot();
		const after = before.replace("Hello React", "Agent Approved");
		const changeSet = {
			id: "agent:component-review",
			baseRevision: snapshot.revision,
			summary: "Update the heading",
			changes: [
				{
					op: "update" as const,
					path: "/src/App.js",
					beforeHash: snapshot.files["/src/App.js"].hash,
					content: after,
				},
			],
		} satisfies WorkspaceChangeSet;
		finalizeSession(snapshot, changeSet);
		useEditor.getState().openFile("/src/App.js");
		render(
			<>
				<ChangeSetReview changeSet={changeSet} />
				<EditorPane />
			</>,
		);

		expect(await screen.findByText("Workspace change proposal")).toBeVisible();
		await user.click(
			await screen.findByRole("button", {
				name: "Apply selected Agent changes",
			}),
		);
		await waitFor(() => {
			expect(useFs.getState().filesByPath["/src/App.js"].content).toBe(after);
		});
		expect(useAgentChangeSessionStore.getState().phase).toBe("idle");
		expect(screen.getByText("Applied")).toBeVisible();
		expect(
			screen.queryByRole("toolbar", { name: "Agent change controls" }),
		).toBeNull();

		await user.click(await screen.findByRole("button", { name: "Undo" }));
		await waitFor(() => {
			expect(useFs.getState().filesByPath["/src/App.js"].content).toBe(before);
		});
	});

	it("discards a rejected proposal without leaving a review-again action", async () => {
		const user = userEvent.setup();
		const path = "/src/App.js";
		const before = useFs.getState().filesByPath[path].content;
		const { snapshot } = await browserWorkspace.getSnapshot();
		const changeSet = {
			id: "agent:reject",
			baseRevision: snapshot.revision,
			summary: "Reject this update",
			changes: [
				{
					op: "update" as const,
					path,
					beforeHash: snapshot.files[path].hash,
					content: "rejected content",
				},
			],
		} satisfies WorkspaceChangeSet;
		finalizeSession(snapshot, changeSet);
		useEditor.getState().openFile(path);
		render(
			<>
				<ChangeSetReview changeSet={changeSet} />
				<EditorPane />
			</>,
		);

		await user.click(await screen.findByRole("button", { name: "Reject" }));

		expect(
			screen.getByText("Proposal discarded; no files changed."),
		).toBeVisible();
		expect(screen.queryByRole("button", { name: "Review again" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Apply selected" })).toBeNull();
		expect(useFs.getState().filesByPath[path].content).toBe(before);
		expect(useAgentChangeSessionStore.getState().phase).toBe("idle");
		expect(
			screen.queryByRole("toolbar", { name: "Agent change controls" }),
		).toBeNull();
	});

	it("marks the chat proposal rejected from the editor toolbar", async () => {
		const user = userEvent.setup();
		const path = "/src/App.js";
		const before = useFs.getState().filesByPath[path].content;
		const { snapshot } = await browserWorkspace.getSnapshot();
		const changeSet = {
			id: "agent:toolbar-reject",
			baseRevision: snapshot.revision,
			summary: "Reject from the editor",
			changes: [
				{
					op: "update" as const,
					path,
					beforeHash: snapshot.files[path].hash,
					content: "toolbar rejected content",
				},
			],
		} satisfies WorkspaceChangeSet;
		finalizeSession(snapshot, changeSet);
		useEditor.getState().openFile(path);
		render(
			<>
				<ChangeSetReview changeSet={changeSet} />
				<EditorPane />
			</>,
		);

		await user.click(
			await screen.findByRole("button", { name: "Reject all Agent changes" }),
		);

		expect(
			await screen.findByText("Proposal discarded; no files changed."),
		).toBeVisible();
		expect(useFs.getState().filesByPath[path].content).toBe(before);
		expect(useAgentChangeSessionStore.getState().reviewStatus).toBe("rejected");
		expect(
			screen.queryByRole("toolbar", { name: "Agent change controls" }),
		).toBeNull();
	});

	it("shares file selections with the current editor change session", async () => {
		const user = userEvent.setup();
		const firstPath = "/src/App.js";
		const secondPath = "/src/index.js";
		const { snapshot } = await browserWorkspace.getSnapshot();
		const changeSet = {
			id: "agent:shared-selection",
			baseRevision: snapshot.revision,
			summary: "Update two files",
			changes: [
				{
					op: "update" as const,
					path: firstPath,
					beforeHash: snapshot.files[firstPath].hash,
					content: snapshot.files[firstPath].content.replace(
						"Hello React",
						"Shared selection",
					),
				},
				{
					op: "update" as const,
					path: secondPath,
					beforeHash: snapshot.files[secondPath].hash,
					content: `${snapshot.files[secondPath].content}\n// Agent change\n`,
				},
			],
		} satisfies WorkspaceChangeSet;
		finalizeSession(snapshot, changeSet);
		useAgentChangeSessionStore.getState().discardPath(firstPath);

		render(<ChangeSetReview changeSet={changeSet} />);

		const firstFile = await screen.findByRole("checkbox", {
			name: `Select all changes in ${firstPath}`,
		});
		const secondFile = await screen.findByRole("checkbox", {
			name: `Select all changes in ${secondPath}`,
		});
		await waitFor(() => expect(firstFile).not.toBeChecked());
		expect(secondFile).toBeChecked();

		await user.click(firstFile);
		expect(useAgentChangeSessionStore.getState().discardedPaths).toEqual([]);

		await user.click(secondFile);
		expect(useAgentChangeSessionStore.getState().discardedPaths).toEqual([
			secondPath,
		]);
	});

	it("offers regeneration from current files after an apply conflict", async () => {
		const user = userEvent.setup();
		const onRegenerate = vi.fn();
		const path = "/src/App.js";
		const { snapshot } = await browserWorkspace.getSnapshot();
		const changeSet = {
			id: "agent:conflict",
			baseRevision: snapshot.revision,
			summary: "Conflicting update",
			changes: [
				{
					op: "update" as const,
					path,
					beforeHash: snapshot.files[path].hash,
					content: "agent content",
				},
			],
		} satisfies WorkspaceChangeSet;
		finalizeSession(snapshot, changeSet);
		await browserWorkspace.updateFileContent(path, "user edited while running");
		render(
			<ChangeSetReview changeSet={changeSet} onRegenerate={onRegenerate} />,
		);

		const applyButton = await screen.findByRole("button", {
			name: "Apply selected",
		});
		expect(applyButton).toHaveClass("from-blue-600", "to-violet-600");
		await user.click(applyButton);
		const regenerate = await screen.findByRole("button", {
			name: "Regenerate from current workspace",
		});
		expect(useAgentChangeSessionStore.getState().phase).toBe("finalized");
		await user.click(regenerate);

		expect(onRegenerate).toHaveBeenCalledOnce();
		expect(useFs.getState().filesByPath[path].content).toBe(
			"user edited while running",
		);
	});
});
