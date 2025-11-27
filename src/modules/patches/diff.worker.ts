/**
 * Web Worker for heavy diff operations
 * Offloads CPU-intensive diff parsing to a separate thread
 */

import { structuredPatch } from "diff";

// Re-implement core types to avoid import issues in worker context
interface Hunk {
	index: number;
	oldStart: number;
	oldLines: number;
	newStart: number;
	newLines: number;
	lines: string[];
	header: string;
}

interface ParsedHunks {
	path: string;
	op: "create" | "update" | "delete";
	hunks: Hunk[];
}

// Message types for worker communication
export interface WorkerRequest {
	id: number;
	type: "parseHunks" | "applySelectedHunks";
	payload: ParseHunksPayload | ApplySelectedHunksPayload;
}

export interface ParseHunksPayload {
	oldContent: string;
	newContent: string;
	path: string;
	op: "create" | "update" | "delete";
}

export interface ApplySelectedHunksPayload {
	oldContent: string;
	parsedHunks: ParsedHunks;
	selectedHunkIndices: number[];
}

export interface WorkerResponse {
	id: number;
	type: "success" | "error";
	result?: ParsedHunks | string;
	error?: string;
}

/**
 * Parse hunks (worker version)
 */
function parseHunks(
	oldContent: string,
	newContent: string,
	path: string,
	op: "create" | "update" | "delete",
): ParsedHunks {
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
 * Apply selected hunks (worker version)
 */
function applySelectedHunks(
	oldContent: string,
	parsedHunks: ParsedHunks,
	selectedHunkIndices: Set<number>,
): string {
	if (selectedHunkIndices.size === 0) {
		return oldContent;
	}

	if (parsedHunks.op === "create") {
		if (selectedHunkIndices.has(0)) {
			return parsedHunks.hunks[0].lines
				.map((line) => line.substring(1))
				.join("\n");
		}
		return "";
	}

	if (parsedHunks.op === "delete") {
		return selectedHunkIndices.has(0) ? "" : oldContent;
	}

	const lines = oldContent.split("\n");
	const result: string[] = [];
	let oldLinePos = 1;

	const sortedHunks = [...parsedHunks.hunks].sort(
		(a, b) => a.oldStart - b.oldStart,
	);

	for (const hunk of sortedHunks) {
		const isSelected = selectedHunkIndices.has(hunk.index);

		while (oldLinePos < hunk.oldStart) {
			result.push(lines[oldLinePos - 1]);
			oldLinePos++;
		}

		if (isSelected) {
			for (const line of hunk.lines) {
				if (line === "\\ No newline at end of file") {
					continue;
				}

				const prefix = line[0];
				const content = line.substring(1);

				if (prefix === "+") {
					result.push(content);
				} else if (prefix === "-") {
					oldLinePos++;
				} else {
					result.push(content);
					oldLinePos++;
				}
			}
		} else {
			for (let i = 0; i < hunk.oldLines; i++) {
				if (oldLinePos - 1 < lines.length) {
					result.push(lines[oldLinePos - 1]);
					oldLinePos++;
				}
			}
		}
	}

	while (oldLinePos - 1 < lines.length) {
		result.push(lines[oldLinePos - 1]);
		oldLinePos++;
	}

	return result.join("\n");
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
	const { id, type, payload } = event.data;

	try {
		let result: ParsedHunks | string;

		if (type === "parseHunks") {
			const p = payload as ParseHunksPayload;
			result = parseHunks(p.oldContent, p.newContent, p.path, p.op);
		} else if (type === "applySelectedHunks") {
			const p = payload as ApplySelectedHunksPayload;
			result = applySelectedHunks(
				p.oldContent,
				p.parsedHunks,
				new Set(p.selectedHunkIndices),
			);
		} else {
			throw new Error(`Unknown message type: ${type}`);
		}

		const response: WorkerResponse = { id, type: "success", result };
		self.postMessage(response);
	} catch (error) {
		const response: WorkerResponse = {
			id,
			type: "error",
			error: error instanceof Error ? error.message : String(error),
		};
		self.postMessage(response);
	}
};
