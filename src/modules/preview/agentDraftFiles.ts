import type {
	AgentChangeSessionState,
	ProjectedAgentChange,
} from "@/modules/agent-chat/change-session";
import { materializeHunkSelection } from "@/modules/workspace/hunk-selection";
import type {
	WorkspaceChange,
	WorkspaceChangeSet,
	WorkspaceFiles,
} from "@/modules/workspace/types";

type AgentDraftState = Pick<
	AgentChangeSessionState,
	"baseFiles" | "changesByPath" | "discardedPaths"
>;

export function materializeAgentDraftFiles({
	baseFiles,
	changesByPath,
	discardedPaths,
}: AgentDraftState): WorkspaceFiles | null {
	const discarded = new Set(discardedPaths);
	const changes = Object.values(changesByPath).filter(
		(change) => !discarded.has(change.path),
	);
	if (changes.length === 0) return null;

	const files = { ...baseFiles };
	for (const change of changes) applyAgentChange(files, change);
	return files;
}

export async function materializeSelectedAgentDraftFiles({
	baseFiles,
	changeSet,
	reviewSelections,
}: {
	baseFiles: WorkspaceFiles;
	changeSet: WorkspaceChangeSet;
	reviewSelections: Record<number, number[]>;
}): Promise<WorkspaceFiles | null> {
	const selectedChangeSet = await materializeHunkSelection(
		changeSet,
		baseFiles,
		reviewSelections,
	);
	if (!("changes" in selectedChangeSet)) return null;

	const files = { ...baseFiles };
	for (const change of selectedChangeSet.changes) {
		applyAgentChange(files, change);
	}
	return files;
}

function applyAgentChange(
	files: WorkspaceFiles,
	change: ProjectedAgentChange | WorkspaceChange,
): void {
	if (change.op === "delete") {
		delete files[change.path];
		return;
	}
	files[change.path] = change.content;
}
