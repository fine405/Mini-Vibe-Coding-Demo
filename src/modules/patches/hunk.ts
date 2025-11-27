import { structuredPatch } from "diff";

/**
 * Represents a single hunk (chunk) of changes within a file diff
 */
export interface Hunk {
	/** 0-indexed hunk number within the file */
	index: number;
	/** Starting line in the old file (1-indexed) */
	oldStart: number;
	/** Number of lines in the old file */
	oldLines: number;
	/** Starting line in the new file (1-indexed) */
	newStart: number;
	/** Number of lines in the new file */
	newLines: number;
	/** The actual diff lines (with +/- prefixes) */
	lines: string[];
	/** Human-readable header like "@@ -1,5 +1,7 @@" */
	header: string;
}

/**
 * Parsed hunks for a file change
 */
export interface ParsedHunks {
	/** Path of the file */
	path: string;
	/** Operation type */
	op: "create" | "update" | "delete";
	/** List of hunks */
	hunks: Hunk[];
}

/**
 * Parse a file change into structured hunks using the diff library
 */
export function parseHunks(
	oldContent: string,
	newContent: string,
	path: string,
	op: "create" | "update" | "delete",
): ParsedHunks {
	// For delete operations, treat entire file as a single "remove" hunk
	if (op === "delete") {
		const lines = oldContent.split("\n");
		return {
			path,
			op,
			hunks: [
				{
					index: 0,
					oldStart: 1,
					oldLines: lines.length,
					newStart: 1,
					newLines: 0,
					lines: lines.map((line) => `-${line}`),
					header: `@@ -1,${lines.length} +1,0 @@`,
				},
			],
		};
	}

	// For create operations, treat entire file as a single "add" hunk
	if (op === "create") {
		const lines = newContent.split("\n");
		return {
			path,
			op,
			hunks: [
				{
					index: 0,
					oldStart: 1,
					oldLines: 0,
					newStart: 1,
					newLines: lines.length,
					lines: lines.map((line) => `+${line}`),
					header: `@@ -1,0 +1,${lines.length} @@`,
				},
			],
		};
	}

	// For update operations, use structuredPatch to get hunks
	const patch = structuredPatch(path, path, oldContent, newContent, "", "", {
		context: 3,
	});

	return {
		path,
		op,
		hunks: patch.hunks.map((hunk, index) => ({
			index,
			oldStart: hunk.oldStart,
			oldLines: hunk.oldLines,
			newStart: hunk.newStart,
			newLines: hunk.newLines,
			lines: hunk.lines,
			header: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
		})),
	};
}

/**
 * Apply selected hunks to produce the final content
 * Hunks must be applied in order to maintain line number consistency
 */
export function applySelectedHunks(
	oldContent: string,
	parsedHunks: ParsedHunks,
	selectedHunkIndices: Set<number>,
): string {
	// If no hunks selected, return original content
	if (selectedHunkIndices.size === 0) {
		return oldContent;
	}

	// For create: if selected, return new content; otherwise empty
	if (parsedHunks.op === "create") {
		if (selectedHunkIndices.has(0)) {
			// Reconstruct content from hunk lines (remove + prefix)
			return parsedHunks.hunks[0].lines
				.map((line) => line.substring(1))
				.join("\n");
		}
		return "";
	}

	// For delete: if selected, return empty (file will be deleted)
	if (parsedHunks.op === "delete") {
		return selectedHunkIndices.has(0) ? "" : oldContent;
	}

	// For update: apply selected hunks
	const lines = oldContent.split("\n");
	const result: string[] = [];

	// Track current position in old content (1-indexed to match hunk.oldStart)
	let oldLinePos = 1;

	// Sort hunks by oldStart to process in order
	const sortedHunks = [...parsedHunks.hunks].sort(
		(a, b) => a.oldStart - b.oldStart,
	);

	for (const hunk of sortedHunks) {
		const isSelected = selectedHunkIndices.has(hunk.index);

		// Copy unchanged lines before this hunk (from oldLinePos to hunk.oldStart - 1)
		while (oldLinePos < hunk.oldStart) {
			result.push(lines[oldLinePos - 1]);
			oldLinePos++;
		}

		if (isSelected) {
			// Apply the hunk: process each line
			for (const line of hunk.lines) {
				// Skip "no newline at end of file" markers
				if (line === "\\ No newline at end of file") {
					continue;
				}

				const prefix = line[0];
				const content = line.substring(1);

				if (prefix === "+") {
					// Added line - include in result
					result.push(content);
				} else if (prefix === "-") {
					// Removed line - skip it, advance old position
					oldLinePos++;
				} else {
					// Context line (space prefix) - include and advance
					result.push(content);
					oldLinePos++;
				}
			}
		} else {
			// Keep original lines for this hunk range
			for (let i = 0; i < hunk.oldLines; i++) {
				if (oldLinePos - 1 < lines.length) {
					result.push(lines[oldLinePos - 1]);
					oldLinePos++;
				}
			}
		}
	}

	// Copy remaining lines after all hunks
	while (oldLinePos - 1 < lines.length) {
		result.push(lines[oldLinePos - 1]);
		oldLinePos++;
	}

	return result.join("\n");
}

/**
 * Check if all hunks are selected
 */
export function areAllHunksSelected(
	hunks: Hunk[],
	selectedIndices: Set<number>,
): boolean {
	return hunks.every((hunk) => selectedIndices.has(hunk.index));
}

/**
 * Check if some (but not all) hunks are selected
 */
export function areSomeHunksSelected(
	hunks: Hunk[],
	selectedIndices: Set<number>,
): boolean {
	const selectedCount = hunks.filter((hunk) =>
		selectedIndices.has(hunk.index),
	).length;
	return selectedCount > 0 && selectedCount < hunks.length;
}
