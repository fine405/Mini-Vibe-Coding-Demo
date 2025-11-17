import type { Patch } from "./types";

/**
 * Load all patches from public/patches directory
 */
export async function loadPatches(): Promise<Patch[]> {
	// In a real app, this would dynamically load all JSON files
	// For now, we'll manually import known patches
	const patches: Patch[] = [];

	try {
		const todoAppPatch = await fetch("/patches/todo-app.json");
		if (todoAppPatch.ok) {
			patches.push(await todoAppPatch.json());
		}
	} catch (error) {
		console.warn("Failed to load todo-app patch:", error);
	}

	return patches;
}

/**
 * Match a patch by user input trigger
 */
export function matchPatchByTrigger(
	patches: Patch[],
	input: string,
): Patch | null {
	const normalizedInput = input.toLowerCase().trim();

	// Simple substring matching for now
	// In a real app, this could use fuzzy matching or embeddings
	for (const patch of patches) {
		const normalizedTrigger = patch.trigger.toLowerCase();
		if (
			normalizedInput.includes(normalizedTrigger) ||
			normalizedTrigger.includes(normalizedInput)
		) {
			return patch;
		}
	}

	return null;
}
