import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyMatch } from "./fuzzyMatch";

describe("fuzzyMatch", () => {
	it("should match exact strings", () => {
		const result = fuzzyMatch("test", "test");
		expect(result.matched).toBe(true);
		expect(result.matchedIndices).toEqual([0, 1, 2, 3]);
	});

	it("should match with gaps", () => {
		const result = fuzzyMatch("tst", "test");
		expect(result.matched).toBe(true);
		expect(result.matchedIndices).toEqual([0, 2, 3]);
	});

	it("should be case insensitive", () => {
		const result = fuzzyMatch("app", "App.tsx");
		expect(result.matched).toBe(true);
		expect(result.matchedIndices).toEqual([0, 1, 2]);
	});

	it("should match file paths", () => {
		const result = fuzzyMatch("src/app", "/src/App.tsx");
		expect(result.matched).toBe(true);
	});

	it("should not match when pattern is not found", () => {
		const result = fuzzyMatch("xyz", "test");
		expect(result.matched).toBe(false);
	});

	it("should return empty result for empty pattern", () => {
		const result = fuzzyMatch("", "test");
		expect(result.matched).toBe(true);
		expect(result.matchedIndices).toEqual([]);
	});

	it("should give higher score for consecutive matches", () => {
		const consecutive = fuzzyMatch("app", "application");
		const nonConsecutive = fuzzyMatch("apc", "application");
		expect(consecutive.score).toBeGreaterThan(nonConsecutive.score);
	});

	it("should give bonus for matching at word boundaries", () => {
		const boundary = fuzzyMatch("at", "/App.tsx");
		const nonBoundary = fuzzyMatch("pp", "/App.tsx");
		expect(boundary.score).toBeGreaterThan(nonBoundary.score);
	});
});

describe("fuzzyFilter", () => {
	it("should filter and sort items by score", () => {
		const items = [
			"/src/components/Button.tsx",
			"/src/App.tsx",
			"/src/utils/api.ts",
			"/tests/app.test.ts",
		];

		const result = fuzzyFilter(items, "app", (item) => item);

		expect(result.length).toBeGreaterThan(0);
		expect(result).toContain("/src/App.tsx");
		expect(result).toContain("/tests/app.test.ts");
	});

	it("should return all items for empty pattern", () => {
		const items = ["/file1.js", "/file2.js"];
		const result = fuzzyFilter(items, "", (item) => item);
		expect(result).toEqual(items);
	});

	it("should return empty array when no matches", () => {
		const items = ["/file1.js", "/file2.js"];
		const result = fuzzyFilter(items, "xyz", (item) => item);
		expect(result).toEqual([]);
	});

	it("should work with custom getText function", () => {
		const items = [
			{ name: "App.tsx", path: "/src/App.tsx" },
			{ name: "Button.tsx", path: "/src/Button.tsx" },
		];

		const result = fuzzyFilter(items, "app", (item) => item.path);

		expect(result.length).toBe(1);
		expect(result[0].name).toBe("App.tsx");
	});
});
