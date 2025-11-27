import { describe, expect, it } from "vitest";
import {
	applySelectedHunks,
	areAllHunksSelected,
	areSomeHunksSelected,
	type Hunk,
	parseHunks,
} from "./hunk";

describe("parseHunks", () => {
	it("should parse create operation as single hunk", () => {
		const result = parseHunks("", "line1\nline2\nline3", "test.ts", "create");

		expect(result.op).toBe("create");
		expect(result.hunks).toHaveLength(1);
		expect(result.hunks[0].index).toBe(0);
		expect(result.hunks[0].oldLines).toBe(0);
		expect(result.hunks[0].newLines).toBe(3);
		expect(result.hunks[0].lines).toEqual(["+line1", "+line2", "+line3"]);
	});

	it("should parse delete operation as single hunk", () => {
		const result = parseHunks("line1\nline2", "", "test.ts", "delete");

		expect(result.op).toBe("delete");
		expect(result.hunks).toHaveLength(1);
		expect(result.hunks[0].oldLines).toBe(2);
		expect(result.hunks[0].newLines).toBe(0);
		expect(result.hunks[0].lines).toEqual(["-line1", "-line2"]);
	});

	it("should parse update operation into multiple hunks", () => {
		const oldContent = `line1
line2
line3
line4
line5
line6
line7
line8
line9
line10`;

		const newContent = `line1
MODIFIED2
line3
line4
line5
line6
line7
MODIFIED8
line9
line10`;

		const result = parseHunks(oldContent, newContent, "test.ts", "update");

		expect(result.op).toBe("update");
		// Should have 2 hunks (one for line2 change, one for line8 change)
		expect(result.hunks.length).toBeGreaterThanOrEqual(1);
	});

	it("should parse single-line update as one hunk", () => {
		const oldContent = "hello world";
		const newContent = "hello universe";

		const result = parseHunks(oldContent, newContent, "test.ts", "update");

		expect(result.op).toBe("update");
		expect(result.hunks).toHaveLength(1);
	});
});

describe("applySelectedHunks", () => {
	it("should return original content when no hunks selected", () => {
		const oldContent = "original content";
		const parsed = parseHunks(oldContent, "new content", "test.ts", "update");

		const result = applySelectedHunks(oldContent, parsed, new Set());

		expect(result).toBe(oldContent);
	});

	it("should apply all hunks when all selected", () => {
		const oldContent = "line1\nline2\nline3";
		const newContent = "line1\nMODIFIED\nline3";
		const parsed = parseHunks(oldContent, newContent, "test.ts", "update");

		const allHunks = new Set(parsed.hunks.map((h) => h.index));
		const result = applySelectedHunks(oldContent, parsed, allHunks);

		expect(result).toBe(newContent);
	});

	it("should return new content for create operation when selected", () => {
		const newContent = "new file content";
		const parsed = parseHunks("", newContent, "test.ts", "create");

		const result = applySelectedHunks("", parsed, new Set([0]));

		expect(result).toBe(newContent);
	});

	it("should return empty for create operation when not selected", () => {
		const newContent = "new file content";
		const parsed = parseHunks("", newContent, "test.ts", "create");

		const result = applySelectedHunks("", parsed, new Set());

		expect(result).toBe("");
	});

	it("should return empty for delete operation when selected", () => {
		const oldContent = "content to delete";
		const parsed = parseHunks(oldContent, "", "test.ts", "delete");

		const result = applySelectedHunks(oldContent, parsed, new Set([0]));

		expect(result).toBe("");
	});

	it("should return original for delete operation when not selected", () => {
		const oldContent = "content to keep";
		const parsed = parseHunks(oldContent, "", "test.ts", "delete");

		const result = applySelectedHunks(oldContent, parsed, new Set());

		expect(result).toBe(oldContent);
	});
});

describe("areAllHunksSelected", () => {
	it("should return true when all hunks are selected", () => {
		const hunks: Hunk[] = [
			{
				index: 0,
				oldStart: 1,
				oldLines: 1,
				newStart: 1,
				newLines: 1,
				lines: [],
				header: "",
			},
			{
				index: 1,
				oldStart: 2,
				oldLines: 1,
				newStart: 2,
				newLines: 1,
				lines: [],
				header: "",
			},
			{
				index: 2,
				oldStart: 3,
				oldLines: 1,
				newStart: 3,
				newLines: 1,
				lines: [],
				header: "",
			},
		];
		const selected = new Set([0, 1, 2]);

		expect(areAllHunksSelected(hunks, selected)).toBe(true);
	});

	it("should return false when some hunks are not selected", () => {
		const hunks: Hunk[] = [
			{
				index: 0,
				oldStart: 1,
				oldLines: 1,
				newStart: 1,
				newLines: 1,
				lines: [],
				header: "",
			},
			{
				index: 1,
				oldStart: 2,
				oldLines: 1,
				newStart: 2,
				newLines: 1,
				lines: [],
				header: "",
			},
			{
				index: 2,
				oldStart: 3,
				oldLines: 1,
				newStart: 3,
				newLines: 1,
				lines: [],
				header: "",
			},
		];
		const selected = new Set([0, 2]);

		expect(areAllHunksSelected(hunks, selected)).toBe(false);
	});

	it("should return false when no hunks are selected", () => {
		const hunks: Hunk[] = [
			{
				index: 0,
				oldStart: 1,
				oldLines: 1,
				newStart: 1,
				newLines: 1,
				lines: [],
				header: "",
			},
			{
				index: 1,
				oldStart: 2,
				oldLines: 1,
				newStart: 2,
				newLines: 1,
				lines: [],
				header: "",
			},
		];
		const selected = new Set<number>();

		expect(areAllHunksSelected(hunks, selected)).toBe(false);
	});
});

describe("areSomeHunksSelected", () => {
	it("should return true when some but not all hunks are selected", () => {
		const hunks: Hunk[] = [
			{
				index: 0,
				oldStart: 1,
				oldLines: 1,
				newStart: 1,
				newLines: 1,
				lines: [],
				header: "",
			},
			{
				index: 1,
				oldStart: 2,
				oldLines: 1,
				newStart: 2,
				newLines: 1,
				lines: [],
				header: "",
			},
			{
				index: 2,
				oldStart: 3,
				oldLines: 1,
				newStart: 3,
				newLines: 1,
				lines: [],
				header: "",
			},
		];
		const selected = new Set([0, 2]);

		expect(areSomeHunksSelected(hunks, selected)).toBe(true);
	});

	it("should return false when all hunks are selected", () => {
		const hunks: Hunk[] = [
			{
				index: 0,
				oldStart: 1,
				oldLines: 1,
				newStart: 1,
				newLines: 1,
				lines: [],
				header: "",
			},
			{
				index: 1,
				oldStart: 2,
				oldLines: 1,
				newStart: 2,
				newLines: 1,
				lines: [],
				header: "",
			},
		];
		const selected = new Set([0, 1]);

		expect(areSomeHunksSelected(hunks, selected)).toBe(false);
	});

	it("should return false when no hunks are selected", () => {
		const hunks: Hunk[] = [
			{
				index: 0,
				oldStart: 1,
				oldLines: 1,
				newStart: 1,
				newLines: 1,
				lines: [],
				header: "",
			},
			{
				index: 1,
				oldStart: 2,
				oldLines: 1,
				newStart: 2,
				newLines: 1,
				lines: [],
				header: "",
			},
		];
		const selected = new Set<number>();

		expect(areSomeHunksSelected(hunks, selected)).toBe(false);
	});
});
