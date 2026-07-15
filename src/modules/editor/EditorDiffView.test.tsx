import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorDiffView } from "@/modules/editor/EditorDiffView";

const { diffEditorMock } = vi.hoisted(() => ({
	diffEditorMock: vi.fn((_props: Record<string, unknown>) => (
		<div data-testid="monaco-diff" />
	)),
}));

vi.mock("@monaco-editor/react", () => ({
	DiffEditor: diffEditorMock,
}));

describe("EditorDiffView", () => {
	it("configures Agent review as a read-only unified diff", () => {
		render(
			<EditorDiffView
				inline
				language="typescript"
				modifiedContent={"after\n"}
				originalContent={"before\n"}
			/>,
		);

		const props = diffEditorMock.mock.lastCall?.[0];
		expect(props).toMatchObject({
			keepCurrentModifiedModel: true,
			keepCurrentOriginalModel: true,
			original: "before\n",
			modified: "after\n",
			language: "typescript",
			options: {
				readOnly: true,
				renderSideBySide: false,
				hideUnchangedRegions: {
					enabled: true,
				},
				padding: { top: 8, bottom: 72 },
			},
		});
	});

	it("disposes retained Monaco models after the diff editor unmounts", async () => {
		diffEditorMock.mockClear();
		const original = { isDisposed: vi.fn(() => false), dispose: vi.fn() };
		const modified = { isDisposed: vi.fn(() => false), dispose: vi.fn() };
		const { unmount } = render(
			<EditorDiffView modifiedContent="after" originalContent="before" />,
		);
		const props = diffEditorMock.mock.lastCall?.[0] as {
			onMount(editor: {
				getModel(): { original: typeof original; modified: typeof modified };
			}): void;
		};
		props.onMount({ getModel: () => ({ original, modified }) });

		await act(async () => {
			unmount();
			await Promise.resolve();
		});

		expect(original.dispose).toHaveBeenCalledOnce();
		expect(modified.dispose).toHaveBeenCalledOnce();
	});

	it("keeps the existing full detail diff side by side", () => {
		diffEditorMock.mockClear();
		render(
			<EditorDiffView
				modifiedContent={"after\n"}
				originalContent={"before\n"}
			/>,
		);

		expect(diffEditorMock.mock.lastCall?.[0]).toMatchObject({
			theme: "vs-dark",
			options: {
				renderSideBySide: true,
				hideUnchangedRegions: { enabled: false },
				padding: { top: 8 },
			},
		});
	});
});
