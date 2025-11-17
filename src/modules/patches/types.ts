/**
 * Patch operation types
 */
export type PatchOperationType = "create" | "update" | "delete";

/**
 * Single file operation in a patch
 */
export interface PatchOperation {
	type: PatchOperationType;
	path: string;
	content?: string; // For create/update operations
}

/**
 * A complete patch with metadata
 */
export interface Patch {
	id: string;
	trigger: string; // User input that triggers this patch
	summary: string; // Human-readable description
	operations: PatchOperation[];
}

/**
 * Result of applying a patch
 */
export interface ApplyPatchResult {
	success: boolean;
	error?: string;
	affectedPaths: string[];
}
