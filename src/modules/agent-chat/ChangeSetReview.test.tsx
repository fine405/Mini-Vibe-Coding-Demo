import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangeSetReview } from "@/modules/agent-chat/ChangeSetReview";
import { useFs } from "@/modules/fs/store";
import { browserWorkspace } from "@/modules/workspace/browser";

vi.mock("@/modules/fs/persistence", () => ({
	clearWorkspace: vi.fn().mockResolvedValue(undefined),
	loadWorkspace: vi.fn().mockResolvedValue(null),
	saveWorkspace: vi.fn().mockResolvedValue(undefined),
	scheduleWorkspaceSave: vi.fn(),
}));

describe("ChangeSetReview", () => {
	beforeEach(async () => {
		await useFs.getState().resetFs();
	});

	it("applies an approved ChangeSet through Workspace and can undo it", async () => {
		const user = userEvent.setup();
		const before = useFs.getState().filesByPath["/src/App.js"].content;
		const { snapshot } = await browserWorkspace.getSnapshot();
		const after = before.replace("Hello React", "Agent Approved");
		render(
			<ChangeSetReview
				changeSet={{
					id: "agent:component-review",
					baseRevision: snapshot.revision,
					summary: "Update the heading",
					changes: [
						{
							op: "update",
							path: "/src/App.js",
							beforeHash: snapshot.files["/src/App.js"].hash,
							content: after,
						},
					],
				}}
			/>,
		);

		expect(await screen.findByText("Workspace change proposal")).toBeVisible();
		await user.click(
			await screen.findByRole("button", { name: "Apply selected" }),
		);
		await waitFor(() => {
			expect(useFs.getState().filesByPath["/src/App.js"].content).toBe(after);
		});

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
		render(
			<ChangeSetReview
				changeSet={{
					id: "agent:reject",
					baseRevision: snapshot.revision,
					summary: "Reject this update",
					changes: [
						{
							op: "update",
							path,
							beforeHash: snapshot.files[path].hash,
							content: "rejected content",
						},
					],
				}}
			/>,
		);

		await user.click(await screen.findByRole("button", { name: "Reject" }));

		expect(
			screen.getByText("Proposal discarded; no files changed."),
		).toBeVisible();
		expect(screen.queryByRole("button", { name: "Review again" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Apply selected" })).toBeNull();
		expect(useFs.getState().filesByPath[path].content).toBe(before);
	});

	it("offers regeneration from current files after an apply conflict", async () => {
		const user = userEvent.setup();
		const onRegenerate = vi.fn();
		const path = "/src/App.js";
		const { snapshot } = await browserWorkspace.getSnapshot();
		await browserWorkspace.updateFileContent(path, "user edited while running");
		render(
			<ChangeSetReview
				changeSet={{
					id: "agent:conflict",
					baseRevision: snapshot.revision,
					summary: "Conflicting update",
					changes: [
						{
							op: "update",
							path,
							beforeHash: snapshot.files[path].hash,
							content: "agent content",
						},
					],
				}}
				onRegenerate={onRegenerate}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "Apply selected" }),
		);
		const regenerate = await screen.findByRole("button", {
			name: "Regenerate from current workspace",
		});
		await user.click(regenerate);

		expect(onRegenerate).toHaveBeenCalledOnce();
		expect(useFs.getState().filesByPath[path].content).toBe(
			"user edited while running",
		);
	});
});
