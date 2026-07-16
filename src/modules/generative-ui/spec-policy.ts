import type { ActionBinding, Spec, UIElement } from "@json-render/core";
import { z } from "zod";
import { toggleStateParamsSchema } from "@/modules/generative-ui/catalog";

const setStateParamsSchema = z
	.object({
		statePath: z.string().min(1).max(256).startsWith("/"),
		value: z.unknown(),
	})
	.strict();

function sanitizeActionBinding(value: unknown): ActionBinding | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const candidate = value as { action?: unknown; params?: unknown };
	if (candidate.action === "setState") {
		const params = setStateParamsSchema.safeParse(candidate.params);
		return params.success ? { action: "setState", params: params.data } : null;
	}
	if (candidate.action === "toggleState") {
		const params = toggleStateParamsSchema.safeParse(candidate.params);
		return params.success
			? { action: "toggleState", params: params.data }
			: null;
	}

	return null;
}

function sanitizePressBinding(
	value: unknown,
): ActionBinding | ActionBinding[] | undefined {
	const values = Array.isArray(value) ? value : [value];
	const bindings = values
		.map(sanitizeActionBinding)
		.filter((binding): binding is ActionBinding => binding !== null);

	if (bindings.length === 0) {
		return undefined;
	}
	return bindings.length === 1 ? bindings[0] : bindings;
}

function sanitizeElement(element: UIElement): UIElement {
	const sanitized: UIElement = {
		type: element.type,
		props: element.props,
		children: element.children,
		visible: element.visible,
		repeat: element.repeat,
	};

	if (element.type === "Button") {
		const press = sanitizePressBinding(element.on?.press);
		if (press) {
			sanitized.on = { press };
		}
	}

	return sanitized;
}

export function sanitizeGenerativeSpec(spec: Spec): Spec {
	return {
		root: spec.root,
		state: spec.state,
		elements: Object.fromEntries(
			Object.entries(spec.elements).map(([key, element]) => [
				key,
				sanitizeElement(element),
			]),
		),
	};
}
