import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type CompletedAgentToolResult,
	useAgentChangeSessionStore,
} from "@/modules/agent-chat/change-session";
import { EditorPane } from "@/modules/editor/EditorPane";
import { useEditor } from "@/modules/editor/store";
import { useFs } from "@/modules/fs/store";
import { browserWorkspace } from "@/modules/workspace/browser";
import { hashText } from "@/modules/workspace/domain";

vi.mock("@/modules/fs/persistence", () => ({
	clearWorkspace: vi.fn().mockResolvedValue(undefined),
	loadWorkspace: vi.fn().mockResolvedValue(null),
	saveWorkspace: vi.fn().mockResolvedValue(undefined),
	scheduleWorkspaceSave: vi.fn(),
}));

vi.mock("@/modules/editor/EditorDiffView", () => ({
	EditorDiffView: ({
		originalContent,
		modifiedContent,
		inline,
	}: {
		originalContent: string;
		modifiedContent: string;
		inline?: boolean;
	}) => (
		<div
			data-inline={String(inline)}
			data-modified={modifiedContent}
			data-original={originalContent}
			data-testid="diff-editor"
		/>
	),
}));

vi.mock("@/modules/editor/MonacoEditor", () => ({
	MonacoEditorWrapper: ({ value }: { value: string }) => (
		<div data-testid="code-editor">{value}</div>
	),
}));

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

describe("EditorPane Agent projections", () => {
	beforeEach(async () => {
		await useFs.getState().resetFs();
		useEditor.getState().closeAllFiles();
		useAgentChangeSessionStore.getState().clear();
	});

	it("shows a projected write as an inline diff without mutating the workspace", async () => {
		const user = userEvent.setup();
		const path = "/src/App.js";
		const before = useFs.getState().filesByPath[path].content;
		const after = before.replace("Hello React", "Hello Agent");
		const { snapshot } = await browserWorkspace.getSnapshot();
		useAgentChangeSessionStore.getState().begin(snapshot);
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite(path, after));
		useEditor.getState().openFile(path);

		render(<EditorPane />);

		const diff = screen.getByTestId("diff-editor");
		expect(diff).toHaveAttribute("data-inline", "true");
		expect(diff).toHaveAttribute("data-original", before);
		expect(diff).toHaveAttribute("data-modified", after);
		expect(useFs.getState().filesByPath[path].content).toBe(before);

		await user.click(
			screen.getByRole("button", { name: `Discard changes in ${path}` }),
		);

		expect(screen.queryByTestId("diff-editor")).toBeNull();
		expect(screen.getByTestId("code-editor")).toHaveTextContent("Hello React");
		expect(useFs.getState().filesByPath[path].content).toBe(before);
	});

	it("navigates between projected files in their first-change order", async () => {
		const user = userEvent.setup();
		const firstPath = "/src/App.js";
		const secondPath = "/src/index.js";
		const { snapshot } = await browserWorkspace.getSnapshot();
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult(completedWrite(firstPath, "first after\n"));
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite(secondPath, "second after\n"));
		useEditor.getState().openFile(firstPath);

		render(<EditorPane />);

		expect(screen.getByText("1 of 2")).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Previous modified file" }),
		).toBeDisabled();
		await user.click(
			screen.getByRole("button", { name: "Next modified file" }),
		);

		expect(useEditor.getState().activeFilePath).toBe(secondPath);
		expect(screen.getByText("2 of 2")).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Next modified file" }),
		).toBeDisabled();
		expect(screen.getByTestId("diff-editor")).toHaveAttribute(
			"data-modified",
			"second after\n",
		);
	});

	it("renders deletes and temporary created files against the snapshot", async () => {
		const user = userEvent.setup();
		const deletedPath = "/src/index.js";
		const createdPath = "/src/NewPanel.js";
		const deletedContent = useFs.getState().filesByPath[deletedPath].content;
		const { snapshot } = await browserWorkspace.getSnapshot();
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult({
			toolName: "delete_file",
			input: { path: deletedPath },
			output: { path: deletedPath, deleted: true },
		});
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite(createdPath, "export default 1;\n"));
		useEditor.getState().openFile(deletedPath);

		render(<EditorPane />);

		expect(screen.getByTestId("diff-editor")).toHaveAttribute(
			"data-original",
			deletedContent,
		);
		expect(screen.getByTestId("diff-editor")).toHaveAttribute(
			"data-modified",
			"",
		);
		expect(useFs.getState().filesByPath[deletedPath].content).toBe(
			deletedContent,
		);

		await user.click(
			screen.getByRole("button", { name: "Next modified file" }),
		);
		expect(screen.getByTestId("diff-editor")).toHaveAttribute(
			"data-original",
			"",
		);
		expect(screen.getByTestId("diff-editor")).toHaveAttribute(
			"data-modified",
			"export default 1;\n",
		);
		expect(useFs.getState().filesByPath[createdPath]).toBeUndefined();

		await user.click(
			screen.getByRole("button", {
				name: `Discard changes in ${createdPath}`,
			}),
		);
		expect(
			useEditor.getState().openFiles.some((file) => file.path === createdPath),
		).toBe(false);
		expect(useEditor.getState().activeFilePath).toBe(deletedPath);
	});

	it("moves to the next reviewable draft when chat deselects the current file", async () => {
		const firstPath = "/src/App.js";
		const secondPath = "/src/index.js";
		const { snapshot } = await browserWorkspace.getSnapshot();
		const changeSet = {
			id: "agent:editor-selection",
			baseRevision: snapshot.revision,
			summary: "Update two files",
			changes: [
				{
					op: "update" as const,
					path: firstPath,
					beforeHash: snapshot.files[firstPath].hash,
					content: "first after\n",
				},
				{
					op: "update" as const,
					path: secondPath,
					beforeHash: snapshot.files[secondPath].hash,
					content: "second after\n",
				},
			],
		};
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult({
			toolName: "finalize_changes",
			input: { summary: changeSet.summary },
			output: changeSet,
		});
		useAgentChangeSessionStore
			.getState()
			.initializeReviewSelections(changeSet.id, { 0: [0], 1: [0] });
		useEditor.getState().openFile(firstPath);
		render(<EditorPane />);

		act(() => {
			useAgentChangeSessionStore
				.getState()
				.setReviewSelections(changeSet.id, { 0: [], 1: [0] });
		});

		await waitFor(() =>
			expect(useEditor.getState().activeFilePath).toBe(secondPath),
		);
		expect(screen.getByTestId("diff-editor")).toHaveAttribute(
			"data-modified",
			"second after\n",
		);
	});

	it("keeps draft controls available without stealing focus from a normal file", async () => {
		const user = userEvent.setup();
		const firstPath = "/src/App.js";
		const secondPath = "/src/index.js";
		const normalPath = "/package.json";
		const before = useFs.getState().filesByPath[firstPath].content;
		const { snapshot } = await browserWorkspace.getSnapshot();
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult(completedWrite(firstPath, "first after\n"));
		useEditor.getState().openFile(firstPath);
		render(<EditorPane />);

		act(() => {
			useEditor.getState().openFile(normalPath);
			useAgentChangeSessionStore
				.getState()
				.projectToolResult(completedWrite(secondPath, "second after\n"));
			useAgentChangeSessionStore
				.getState()
				.projectToolResult(completedWrite(firstPath, "first latest\n"));
		});

		expect(useEditor.getState().activeFilePath).toBe(normalPath);
		expect(
			screen.getByRole("toolbar", { name: "Agent change controls" }),
		).toBeVisible();
		await user.click(
			screen.getByRole("button", {
				name: `Open modified file ${firstPath}`,
			}),
		);
		expect(screen.getByTestId("diff-editor")).toHaveAttribute(
			"data-original",
			before,
		);
		expect(screen.getByTestId("diff-editor")).toHaveAttribute(
			"data-modified",
			"first latest\n",
		);

		act(() => useEditor.getState().closeAllFiles());
		expect(useEditor.getState().activeFilePath).toBeNull();
		expect(
			screen.getByRole("toolbar", { name: "Agent change controls" }),
		).toBeVisible();
		await user.click(
			screen.getByRole("button", {
				name: `Open modified file ${firstPath}`,
			}),
		);
		expect(useEditor.getState().activeFilePath).toBe(firstPath);
		expect(screen.getByTestId("diff-editor")).toHaveAttribute(
			"data-modified",
			"first latest\n",
		);
	});

	it("requests a run stop when all projected changes are discarded", async () => {
		const user = userEvent.setup();
		const path = "/src/Unapproved.js";
		const { snapshot } = await browserWorkspace.getSnapshot();
		useAgentChangeSessionStore.getState().begin(snapshot);
		useAgentChangeSessionStore
			.getState()
			.projectToolResult(completedWrite(path, "after\n"));
		useEditor.getState().openFile(path);
		render(<EditorPane />);

		await user.click(
			screen.getByRole("button", { name: "Discard all Agent changes" }),
		);

		expect(useAgentChangeSessionStore.getState()).toMatchObject({
			phase: "idle",
			changesByPath: {},
			discardAllRequested: true,
		});
		expect(
			useEditor.getState().openFiles.some((file) => file.path === path),
		).toBe(false);
	});
});
