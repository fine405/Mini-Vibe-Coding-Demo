/**
 * Patch operation types
 */
export type PatchOperationType = "create" | "update" | "delete";

/**
 * Range replacement for partial file updates
 */
export interface ReplaceRange {
	type: "replace-range";
	startLine: number;
	endLine: number;
	content: string;
}

/**
 * Single file change in a patch
 */
export interface PatchChange {
	op: PatchOperationType;
	path: string;
	content?: string; // For create or full-file update
	patch?: ReplaceRange; // For range-based update
}

/**
 * A complete patch with metadata
 */
export interface Patch {
	id: string;
	trigger: string; // User input that triggers this patch
	summary: string; // Human-readable description
	changes: PatchChange[];
}

/**
 * Result of applying a patch
 */
export interface ApplyPatchResult {
	success: boolean;
	error?: string;
	affectedPaths: string[];
}

/**
 * Partial patch with selected changes
 */
export interface PartialPatch {
	patch: Patch;
	selectedChangeIndices: Set<number>;
}
