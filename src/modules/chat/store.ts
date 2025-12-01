import { enableMapSet } from "immer";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Patch } from "@/modules/patches/types";

// Enable immer support for Map and Set
enableMapSet();

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	patch?: Patch; // If assistant message includes a patch
	appliedPatch?: boolean; // If this message confirms a patch was applied
	patchStatus?: "pending" | "applied" | "rejected"; // Status of the patch in this message
	/** Original file contents before patch was applied, used for revert */
	appliedOriginalContents?: Record<string, string>;
	timestamp: number;
}

/** Selection state for hunks: Map<fileIndex, Set<hunkIndex>> */
export type HunkSelection = Map<number, Set<number>>;

/** Pending change being reviewed */
export interface PendingChange {
	messageId: string; // ID of the chat message containing this patch
	patch: Patch;
	fileSelections: Map<number, boolean>; // file index -> selected
	hunkSelections: HunkSelection; // file index -> Set<hunk index>
	status: "pending" | "reviewing" | "applied" | "rejected";
}

/** Review mode state */
export interface ReviewState {
	isReviewing: boolean;
	currentFileIndex: number;
	currentHunkIndex: number;
	totalFiles: number;
	totalHunks: number;
}

interface ChatStore {
	messages: ChatMessage[];
	isLoading: boolean;
	pendingChange: PendingChange | null;
	reviewState: ReviewState;

	// Message actions
	addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
	updateMessagePatchStatus: (
		messageId: string,
		status: "applied" | "rejected",
		originalContents?: Record<string, string>,
	) => void;
	clearMessageOriginalContents: (messageId: string) => void;
	setLoading: (loading: boolean) => void;
	clearMessages: () => void;

	// Pending change actions
	setPendingChange: (change: PendingChange | null) => void;
	updateFileSelection: (
		fileIndex: number,
		selected: boolean,
		hunkCount?: number,
	) => void;
	updateHunkSelection: (
		fileIndex: number,
		hunkIndex: number,
		selected: boolean,
	) => void;
	selectAllHunksInFile: (fileIndex: number, hunkCount: number) => void;
	deselectAllHunksInFile: (fileIndex: number) => void;

	// Review state actions
	startReview: (fileIndex: number) => void;
	endReview: () => void;
	navigateToFile: (fileIndex: number) => void;
	navigateToHunk: (hunkIndex: number) => void;
	setTotalHunks: (count: number) => void;
}

const stateCreator = immer<ChatStore>((set) => ({
	messages: [],
	isLoading: false,
	pendingChange: null,
	reviewState: {
		isReviewing: false,
		currentFileIndex: 0,
		currentHunkIndex: 0,
		totalFiles: 0,
		totalHunks: 0,
	},

	addMessage(message) {
		set((state) => {
			state.messages.push({
				...message,
				id: `msg-${Date.now()}-${Math.random()}`,
				timestamp: Date.now(),
				patchStatus: message.patch ? "pending" : undefined,
			});
		});
	},

	updateMessagePatchStatus(messageId, status, originalContents) {
		set((state) => {
			const msg = state.messages.find((m) => m.id === messageId);
			if (msg) {
				msg.patchStatus = status;
				if (originalContents) {
					msg.appliedOriginalContents = originalContents;
				}
			}
		});
	},

	clearMessageOriginalContents(messageId) {
		set((state) => {
			const msg = state.messages.find((m) => m.id === messageId);
			if (msg) {
				msg.appliedOriginalContents = undefined;
			}
		});
	},

	setLoading(loading) {
		set({ isLoading: loading });
	},

	clearMessages() {
		set({ messages: [], pendingChange: null });
	},

	setPendingChange(change) {
		set({ pendingChange: change });
	},

	updateFileSelection(fileIndex, selected, hunkCount?: number) {
		set((state) => {
			if (state.pendingChange) {
				state.pendingChange.fileSelections.set(fileIndex, selected);
				// Also update hunk selections
				if (selected && hunkCount !== undefined) {
					const allHunks = new Set(
						Array.from({ length: hunkCount }, (_, i) => i),
					);
					state.pendingChange.hunkSelections.set(fileIndex, allHunks);
				} else if (!selected) {
					state.pendingChange.hunkSelections.set(fileIndex, new Set());
				}
			}
		});
	},

	updateHunkSelection(fileIndex, hunkIndex, selected) {
		set((state) => {
			if (state.pendingChange) {
				const fileHunks =
					state.pendingChange.hunkSelections.get(fileIndex) || new Set();
				if (selected) {
					fileHunks.add(hunkIndex);
				} else {
					fileHunks.delete(hunkIndex);
				}
				state.pendingChange.hunkSelections.set(fileIndex, fileHunks);
				// Update file selection based on hunk selection
				state.pendingChange.fileSelections.set(fileIndex, fileHunks.size > 0);
			}
		});
	},

	selectAllHunksInFile(fileIndex, hunkCount) {
		set((state) => {
			if (state.pendingChange) {
				const allHunks = new Set(
					Array.from({ length: hunkCount }, (_, i) => i),
				);
				state.pendingChange.hunkSelections.set(fileIndex, allHunks);
				state.pendingChange.fileSelections.set(fileIndex, true);
			}
		});
	},

	deselectAllHunksInFile(fileIndex) {
		set((state) => {
			if (state.pendingChange) {
				state.pendingChange.hunkSelections.set(fileIndex, new Set());
				state.pendingChange.fileSelections.set(fileIndex, false);
			}
		});
	},

	startReview(fileIndex) {
		set((state) => {
			state.reviewState.isReviewing = true;
			state.reviewState.currentFileIndex = fileIndex;
			state.reviewState.currentHunkIndex = 0;
			state.reviewState.totalFiles =
				state.pendingChange?.patch.changes.length || 0;
		});
	},

	endReview() {
		set((state) => {
			state.reviewState.isReviewing = false;
		});
	},

	navigateToFile(fileIndex) {
		set((state) => {
			state.reviewState.currentFileIndex = fileIndex;
			state.reviewState.currentHunkIndex = 0;
		});
	},

	navigateToHunk(hunkIndex) {
		set((state) => {
			state.reviewState.currentHunkIndex = hunkIndex;
		});
	},

	setTotalHunks(count) {
		set((state) => {
			state.reviewState.totalHunks = count;
		});
	},
}));

export const useChatStore = create<ChatStore>()(
	devtools(stateCreator, { name: "chat-store" }),
);
