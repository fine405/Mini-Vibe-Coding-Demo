import type { Patch } from "./types";

/**
 * Load all patches from public/patches directory
 */
export async function loadPatches(): Promise<Patch[]> {
	// In a real app, this would dynamically load all JSON files
	// For now, we'll manually import known patches
	const patches: Patch[] = [];

	const patchFiles = ["todo-app.json", "add-filters.json"];

	for (const file of patchFiles) {
		try {
			const response = await fetch(`/patches/${file}`);
			if (response.ok) {
				patches.push(await response.json());
			}
		} catch (error) {
			console.warn(`Failed to load ${file}:`, error);
		}
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
