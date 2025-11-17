import type { VirtualFile } from "@/modules/fs/types";
import type { ApplyPatchResult, Patch, PatchChange } from "./types";

/**
 * Apply range replacement to file content
 */
function applyRangeReplace(
	content: string,
	startLine: number,
	endLine: number,
	newContent: string,
): string {
	const lines = content.split("\n");
	// Lines are 1-indexed in the spec
	const before = lines.slice(0, startLine - 1);
	const after = lines.slice(endLine);
	return [...before, newContent, ...after].join("\n");
}

/**
 * Apply a single patch change to the file system
 * Returns a new object with the change applied (for testing)
 */
export function applyChange(
	filesByPath: Record<string, VirtualFile>,
	change: PatchChange,
): Record<string, VirtualFile> {
	const result = { ...filesByPath };
	switch (change.op) {
		case "create": {
			if (!change.content) {
				throw new Error(`Create operation for ${change.path} missing content`);
			}
			result[change.path] = {
				path: change.path,
				content: change.content,
				status: "new",
			};
			break;
		}

		case "update": {
			const existing = result[change.path];
			if (!existing) {
				throw new Error(`Cannot update non-existent file: ${change.path}`);
			}

			let newContent: string;

			// Support both full-file replacement and range replacement
			if (change.patch) {
				// Range-based update
				newContent = applyRangeReplace(
					existing.content,
					change.patch.startLine,
					change.patch.endLine,
					change.patch.content,
				);
			} else if (change.content !== undefined) {
				// Full-file replacement
				newContent = change.content;
			} else {
				throw new Error(
					`Update operation for ${change.path} missing content or patch`,
				);
			}

			result[change.path] = {
				...existing,
				content: newContent,
				status: "modified",
			};
			break;
		}

		case "delete": {
			if (!result[change.path]) {
				throw new Error(`Cannot delete non-existent file: ${change.path}`);
			}
			delete result[change.path];
			break;
		}

		default: {
			const exhaustiveCheck: never = change.op;
			throw new Error(`Unknown operation type: ${exhaustiveCheck}`);
		}
	}
	return result;
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
		let newFilesByPath = filesByPath;
		const affectedPaths: string[] = [];

		// Apply each change
		for (const change of patch.changes) {
			newFilesByPath = applyChange(newFilesByPath, change);
			affectedPaths.push(change.path);
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

	for (const change of patch.changes) {
		switch (change.op) {
			case "create":
				creates.push(change.path);
				break;
			case "update":
				updates.push(change.path);
				break;
			case "delete":
				deletes.push(change.path);
				break;
		}
	}

	return { creates, updates, deletes };
}
