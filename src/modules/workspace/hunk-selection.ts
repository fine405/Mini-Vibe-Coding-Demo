import {
	applySelectedHunksAsync,
	type ParsedHunks,
	parseHunksAsync,
} from "@/modules/patches/hunk";
import type {
	ApplyFailure,
	WorkspaceChange,
	WorkspaceChangeSet,
	WorkspaceFiles,
} from "@/modules/workspace/types";

export async function loadWorkspaceChangeHunks(
	changeSet: WorkspaceChangeSet,
	currentFiles: WorkspaceFiles,
): Promise<ParsedHunks[]> {
	return Promise.all(
		changeSet.changes.map((change) =>
			parseHunksAsync(
				currentFiles[change.path] ?? "",
				change.op === "delete" ? "" : change.content,
				change.path,
				change.op,
			),
		),
	);
}

function invalidSelection(message: string): ApplyFailure {
	return {
		ok: false,
		code: "INVALID_CHANGESET",
		message,
		failedPaths: [],
	};
}

export async function materializeHunkSelection(
	changeSet: WorkspaceChangeSet,
	currentFiles: WorkspaceFiles,
	hunkIndicesByChange: Record<number, number[]>,
): Promise<WorkspaceChangeSet | ApplyFailure> {
	const requestedChangeIndices = Object.keys(hunkIndicesByChange).map(Number);
	if (
		requestedChangeIndices.some(
			(index) =>
				!Number.isInteger(index) ||
				index < 0 ||
				index >= changeSet.changes.length,
		)
	) {
		return invalidSelection("Hunk selection references an unknown change");
	}

	const hunks = await loadWorkspaceChangeHunks(changeSet, currentFiles);
	const changes: WorkspaceChange[] = [];
	for (let index = 0; index < changeSet.changes.length; index += 1) {
		const change = changeSet.changes[index];
		const parsed = hunks[index];
		const validIndices = new Set(parsed.hunks.map((hunk) => hunk.index));
		const requested = hunkIndicesByChange[index];
		if (
			requested?.some(
				(hunkIndex) =>
					!Number.isInteger(hunkIndex) || !validIndices.has(hunkIndex),
			)
		) {
			return invalidSelection(`Hunk selection is invalid for ${change.path}`);
		}
		const selected = new Set(requested ?? validIndices);
		if (selected.size === 0) continue;

		if (change.op !== "update" || selected.size === validIndices.size) {
			changes.push(change);
			continue;
		}

		const before = currentFiles[change.path] ?? "";
		const content = await applySelectedHunksAsync(before, parsed, selected);
		if (content !== before) changes.push({ ...change, content });
	}

	if (changes.length === 0) {
		return invalidSelection("At least one change hunk must be selected");
	}
	return { ...changeSet, id: `${changeSet.id}:selected`, changes };
}
