import { beforeEach, describe, expect, it } from "vitest";
import type { Patch } from "@/modules/patches/types";
import { useChatStore } from "./store";

describe("chat store", () => {
	beforeEach(() => {
		// Reset store to initial state
		useChatStore.getState().clearMessages();
		useChatStore.getState().setPendingChange(null);
		useChatStore.getState().endReview();
	});

	describe("pendingChange and file/hunk selection", () => {
		const mockPatch: Patch = {
			id: "test-patch",
			summary: "Test Patch",
			trigger: "test",
			changes: [
				{ path: "/src/file1.ts", op: "update", content: "new content 1" },
				{ path: "/src/file2.ts", op: "create", content: "new content 2" },
			],
		};

		it("should set pending change with initial selections", () => {
			useChatStore.getState().setPendingChange({
				messageId: "msg-1",
				patch: mockPatch,
				fileSelections: new Map([
					[0, true],
					[1, true],
				]),
				hunkSelections: new Map([
					[0, new Set([0])],
					[1, new Set([0])],
				]),
				status: "pending",
			});

			const { pendingChange } = useChatStore.getState();
			expect(pendingChange).not.toBeNull();
			expect(pendingChange?.patch.id).toBe("test-patch");
			expect(pendingChange?.fileSelections.get(0)).toBe(true);
			expect(pendingChange?.fileSelections.get(1)).toBe(true);
		});

		it("should update file selection", () => {
			useChatStore.getState().setPendingChange({
				messageId: "msg-1",
				patch: mockPatch,
				fileSelections: new Map([
					[0, true],
					[1, true],
				]),
				hunkSelections: new Map([
					[0, new Set([0, 1])],
					[1, new Set([0])],
				]),
				status: "pending",
			});

			// Deselect file 0
			useChatStore.getState().updateFileSelection(0, false);

			const { pendingChange } = useChatStore.getState();
			expect(pendingChange?.fileSelections.get(0)).toBe(false);
			expect(pendingChange?.hunkSelections.get(0)?.size).toBe(0);
		});

		it("should update hunk selection", () => {
			useChatStore.getState().setPendingChange({
				messageId: "msg-1",
				patch: mockPatch,
				fileSelections: new Map([[0, true]]),
				hunkSelections: new Map([[0, new Set([0, 1, 2])]]),
				status: "pending",
			});

			// Deselect hunk 1
			useChatStore.getState().updateHunkSelection(0, 1, false);

			const { pendingChange } = useChatStore.getState();
			expect(pendingChange?.hunkSelections.get(0)?.has(0)).toBe(true);
			expect(pendingChange?.hunkSelections.get(0)?.has(1)).toBe(false);
			expect(pendingChange?.hunkSelections.get(0)?.has(2)).toBe(true);
		});

		it("should select all hunks in file", () => {
			useChatStore.getState().setPendingChange({
				messageId: "msg-1",
				patch: mockPatch,
				fileSelections: new Map([[0, false]]),
				hunkSelections: new Map([[0, new Set()]]),
				status: "pending",
			});

			useChatStore.getState().selectAllHunksInFile(0, 3);

			const { pendingChange } = useChatStore.getState();
			expect(pendingChange?.fileSelections.get(0)).toBe(true);
			expect(pendingChange?.hunkSelections.get(0)?.size).toBe(3);
			expect(pendingChange?.hunkSelections.get(0)?.has(0)).toBe(true);
			expect(pendingChange?.hunkSelections.get(0)?.has(1)).toBe(true);
			expect(pendingChange?.hunkSelections.get(0)?.has(2)).toBe(true);
		});

		it("should deselect all hunks in file", () => {
			useChatStore.getState().setPendingChange({
				messageId: "msg-1",
				patch: mockPatch,
				fileSelections: new Map([[0, true]]),
				hunkSelections: new Map([[0, new Set([0, 1, 2])]]),
				status: "pending",
			});

			useChatStore.getState().deselectAllHunksInFile(0);

			const { pendingChange } = useChatStore.getState();
			expect(pendingChange?.fileSelections.get(0)).toBe(false);
			expect(pendingChange?.hunkSelections.get(0)?.size).toBe(0);
		});
	});

	describe("review state navigation", () => {
		it("should start review with correct file index", () => {
			useChatStore.getState().startReview(2);

			const { reviewState } = useChatStore.getState();
			expect(reviewState.isReviewing).toBe(true);
			expect(reviewState.currentFileIndex).toBe(2);
			expect(reviewState.currentHunkIndex).toBe(0);
		});

		it("should navigate to file", () => {
			useChatStore.getState().startReview(0);
			useChatStore.getState().navigateToFile(3);

			const { reviewState } = useChatStore.getState();
			expect(reviewState.currentFileIndex).toBe(3);
			expect(reviewState.currentHunkIndex).toBe(0);
		});

		it("should navigate to hunk", () => {
			useChatStore.getState().startReview(0);
			useChatStore.getState().navigateToHunk(5);

			const { reviewState } = useChatStore.getState();
			expect(reviewState.currentHunkIndex).toBe(5);
		});

		it("should set total hunks", () => {
			useChatStore.getState().startReview(0);
			useChatStore.getState().setTotalHunks(10);

			const { reviewState } = useChatStore.getState();
			expect(reviewState.totalHunks).toBe(10);
		});

		it("should end review and set isReviewing to false", () => {
			useChatStore.getState().startReview(2);
			useChatStore.getState().navigateToHunk(5);
			useChatStore.getState().setTotalHunks(10);
			useChatStore.getState().endReview();

			const { reviewState } = useChatStore.getState();
			expect(reviewState.isReviewing).toBe(false);
			// Note: endReview only sets isReviewing to false, other state is preserved
			expect(reviewState.currentFileIndex).toBe(2);
			expect(reviewState.currentHunkIndex).toBe(5);
			expect(reviewState.totalHunks).toBe(10);
		});
	});

	describe("message patch status", () => {
		it("should update message patch status to applied with original contents", () => {
			useChatStore.getState().addMessage({
				role: "assistant",
				content: "Here are some changes",
				patch: {
					id: "p1",
					summary: "Test",
					trigger: "test",
					changes: [{ path: "/file.ts", op: "update", content: "new" }],
				},
			});

			const messages = useChatStore.getState().messages;
			const msgId = messages[0].id;

			useChatStore.getState().updateMessagePatchStatus(msgId, "applied", {
				"/file.ts": "original content",
			});

			const updated = useChatStore.getState().messages[0];
			expect(updated.patchStatus).toBe("applied");
			expect(updated.appliedOriginalContents).toEqual({
				"/file.ts": "original content",
			});
		});

		it("should clear message original contents", () => {
			useChatStore.getState().addMessage({
				role: "assistant",
				content: "Changes",
				patch: {
					id: "p1",
					summary: "Test",
					trigger: "test",
					changes: [],
				},
			});

			const msgId = useChatStore.getState().messages[0].id;
			useChatStore.getState().updateMessagePatchStatus(msgId, "applied", {
				"/file.ts": "original",
			});
			useChatStore.getState().clearMessageOriginalContents(msgId);

			const msg = useChatStore.getState().messages[0];
			expect(msg.appliedOriginalContents).toBeUndefined();
		});
	});
});
