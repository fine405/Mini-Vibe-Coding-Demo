import type { ModelSelection, PublicProvider } from "@/modules/providers/types";

function selectionExists(
	providers: PublicProvider[],
	selection: ModelSelection | null | undefined,
	requireConfigured: boolean,
): selection is ModelSelection {
	if (!selection) return false;
	const provider = providers.find(
		(candidate) => candidate.id === selection.providerId,
	);
	return Boolean(
		provider &&
			(!requireConfigured || provider.configured) &&
			provider.models.some((model) => model.id === selection.modelId),
	);
}

function defaultSelection(provider: PublicProvider): ModelSelection | null {
	const model =
		provider.models.find(
			(candidate) => candidate.id === provider.defaultModelId,
		) ?? provider.models[0];
	return model ? { providerId: provider.id, modelId: model.id } : null;
}

export function resolveProviderSelection(
	providers: PublicProvider[],
	preferred?: ModelSelection | null,
): ModelSelection | null {
	if (selectionExists(providers, preferred, true)) return preferred;

	for (const provider of providers) {
		if (!provider.configured) continue;
		const selection = defaultSelection(provider);
		if (selection) return selection;
	}

	for (const provider of providers) {
		const selection = defaultSelection(provider);
		if (selection) return selection;
	}

	return null;
}
