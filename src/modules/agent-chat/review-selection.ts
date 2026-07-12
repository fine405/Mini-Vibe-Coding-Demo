import type { ParsedHunks } from "@/modules/patches/hunk";
import type { ChangeSelection } from "@/modules/workspace/types";

export type ChangeHunkSelections = ReadonlyMap<number, ReadonlySet<number>>;

export function selectAllChangeHunks(
	hunks: ParsedHunks[],
): Map<number, Set<number>> {
	return new Map(
		hunks.map((file, index) => [
			index,
			new Set(file.hunks.map((hunk) => hunk.index)),
		]),
	);
}

export function toWorkspaceChangeSelection(
	selections: ChangeHunkSelections,
): ChangeSelection {
	return {
		hunkIndicesByChange: Object.fromEntries(
			[...selections].map(([index, selected]) => [index, [...selected]]),
		),
	};
}
