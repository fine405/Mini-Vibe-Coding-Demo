import { CheckIcon, ChevronDownIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorLogo,
	ModelSelectorName,
	ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ModelSelection, PublicProvider } from "@/modules/providers/types";

interface ProviderModelSelectorProps {
	providers: PublicProvider[];
	selection: ModelSelection | null;
	isLoading?: boolean;
	onSelect(selection: ModelSelection): void;
}

const logoIds: Record<string, string> = {
	qwen: "alibaba-cn",
	moonshot: "moonshotai",
};

export function ProviderModelSelector({
	providers,
	selection,
	isLoading = false,
	onSelect,
}: ProviderModelSelectorProps) {
	const [open, setOpen] = useState(false);
	const selectedProvider = providers.find(
		(provider) => provider.id === selection?.providerId,
	);
	const selectedModel = selectedProvider?.models.find(
		(model) => model.id === selection?.modelId,
	);

	return (
		<ModelSelector open={open} onOpenChange={setOpen}>
			<ModelSelectorTrigger asChild>
				<Button
					aria-label="Select AI provider and model"
					className="min-w-0 max-w-full justify-start gap-2"
					disabled={isLoading}
					size="sm"
					variant="ghost"
				>
					{selectedProvider ? (
						<ModelSelectorLogo
							provider={logoIds[selectedProvider.id] ?? selectedProvider.id}
						/>
					) : (
						<KeyRoundIcon className="size-3.5" />
					)}
					<span className="truncate">
						{isLoading
							? "Loading models…"
							: (selectedModel?.label ?? "Select model")}
					</span>
					{selectedProvider && !selectedProvider.configured && (
						<Badge className="ml-auto" variant="outline">
							No key
						</Badge>
					)}
					<ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
				</Button>
			</ModelSelectorTrigger>
			<ModelSelectorContent className="sm:max-w-lg" title="Select AI model">
				<ModelSelectorInput placeholder="Search providers and models…" />
				<ModelSelectorList>
					<ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
					{providers.map((provider) => (
						<ModelSelectorGroup
							key={provider.id}
							heading={
								provider.configured
									? provider.name
									: `${provider.name} · set ${provider.missingEnvVars.join(" or ")}`
							}
						>
							{provider.models.map((model) => {
								const selected =
									selection?.providerId === provider.id &&
									selection.modelId === model.id;
								return (
									<ModelSelectorItem
										disabled={!provider.configured}
										key={model.id}
										onSelect={() => {
											if (!provider.configured) return;
											onSelect({
												providerId: provider.id,
												modelId: model.id,
											});
											setOpen(false);
										}}
										value={`${provider.name} ${model.label} ${model.id}`}
									>
										<ModelSelectorLogo
											provider={logoIds[provider.id] ?? provider.id}
										/>
										<div className="min-w-0 flex-1">
											<ModelSelectorName>{model.label}</ModelSelectorName>
											<p className="truncate text-xs text-muted-foreground">
												{model.description}
											</p>
										</div>
										{selected && <CheckIcon className="ml-auto size-4" />}
									</ModelSelectorItem>
								);
							})}
						</ModelSelectorGroup>
					))}
				</ModelSelectorList>
			</ModelSelectorContent>
		</ModelSelector>
	);
}
