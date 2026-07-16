import { getByPath } from "@json-render/core";
import { toggleStateParamsSchema } from "@/modules/generative-ui/catalog";

export function getToggleStateUpdate(
	params: unknown,
	state: Record<string, unknown>,
): { statePath: string; value: boolean } | null {
	const parsed = toggleStateParamsSchema.safeParse(params);
	if (!parsed.success) {
		return null;
	}
	return {
		statePath: parsed.data.statePath,
		value: !getByPath(state, parsed.data.statePath),
	};
}
