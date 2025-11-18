import { describe, expect, it } from "vitest";
import { matchPatchByTrigger } from "./loader";
import type { Patch } from "./types";

const basePatches: Patch[] = [
	{
		id: "todo-app",
		trigger: "create a react todo app",
		summary: "Create base todo app",
		changes: [],
	},
	{
		id: "add-filters",
		trigger: "add filter buttons",
		summary: "Add filter buttons to todo app",
		changes: [],
	},
];

describe("matchPatchByTrigger", () => {
	it("matches follow-up patches like 'add filter buttons'", () => {
		const match = matchPatchByTrigger(basePatches, "add filter buttons");
		expect(match?.id).toBe("add-filters");
	});

	it("is case-insensitive for user input", () => {
		const match = matchPatchByTrigger(basePatches, "Add Filter Buttons");
		expect(match?.id).toBe("add-filters");
	});

	it("returns null for unknown requests", () => {
		const match = matchPatchByTrigger(basePatches, "unknown request");
		expect(match).toBeNull();
	});
});
