export { browserWorkspace } from "@/modules/workspace/browser";
export { loadWorkspaceChangeHunks } from "@/modules/workspace/hunk-selection";
export type {
	ApplyResult,
	ChangePreview,
	ChangeSelection,
	SnapshotPreflight,
	WorkspaceChange,
	WorkspaceChangeSet,
	WorkspaceSnapshot,
} from "@/modules/workspace/types";
export {
	createMemoryWorkspace,
	WorkspaceService,
} from "@/modules/workspace/workspace";
