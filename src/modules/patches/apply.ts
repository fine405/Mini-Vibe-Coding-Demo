import type { VirtualFile } from "@/modules/fs/types";
import type { ApplyPatchResult, Patch, PatchOperation } from "./types";

/**
 * Apply a single patch operation to the file system
 */
function applyOperation(
	filesByPath: Record<string, VirtualFile>,
	operation: PatchOperation,
): void {
	switch (operation.type) {
		case "create": {
			if (!operation.content) {
				throw new Error(
					`Create operation for ${operation.path} missing content`,
				);
			}
			filesByPath[operation.path] = {
				path: operation.path,
				content: operation.content,
				status: "new",
			};
			break;
		}

		case "update": {
			if (!operation.content) {
				throw new Error(
					`Update operation for ${operation.path} missing content`,
				);
			}
			const existing = filesByPath[operation.path];
			if (!existing) {
				throw new Error(`Cannot update non-existent file: ${operation.path}`);
			}
			filesByPath[operation.path] = {
				...existing,
				content: operation.content,
				status: "modified",
			};
			break;
		}

		case "delete": {
			if (!filesByPath[operation.path]) {
				throw new Error(`Cannot delete non-existent file: ${operation.path}`);
			}
			delete filesByPath[operation.path];
			break;
		}

		default:
			throw new Error(`Unknown operation type: ${(operation as any).type}`);
	}
}

/**
 * Apply a patch to the file system (pure function)
 * Returns a new filesByPath object with the patch applied
 */
export function applyPatchToFs(
	filesByPath: Record<string, VirtualFile>,
	patch: Patch,
): ApplyPatchResult {
	try {
		// Create a deep copy to avoid mutating the original
		const newFilesByPath: Record<string, VirtualFile> = {};
		for (const [path, file] of Object.entries(filesByPath)) {
			newFilesByPath[path] = { ...file };
		}

		const affectedPaths: string[] = [];

		// Apply each operation
		for (const operation of patch.operations) {
			applyOperation(newFilesByPath, operation);
			affectedPaths.push(operation.path);
		}

		return {
			success: true,
			affectedPaths,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			affectedPaths: [],
		};
	}
}

/**
 * Preview what changes a patch would make (without applying)
 */
export function previewPatch(patch: Patch): {
	creates: string[];
	updates: string[];
	deletes: string[];
} {
	const creates: string[] = [];
	const updates: string[] = [];
	const deletes: string[] = [];

	for (const op of patch.operations) {
		switch (op.type) {
			case "create":
				creates.push(op.path);
				break;
			case "update":
				updates.push(op.path);
				break;
			case "delete":
				deletes.push(op.path);
				break;
		}
	}

	return { creates, updates, deletes };
}
