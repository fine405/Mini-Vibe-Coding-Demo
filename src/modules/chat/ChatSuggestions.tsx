import { ArrowRightIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	type ChatSuggestion,
	SUGGESTION_GROUPS,
	type SuggestionTab,
} from "@/modules/chat/suggestion-prompts";

const SUGGESTIONS_PER_BATCH = 3;

function visibleSuggestions(
	tab: SuggestionTab,
	batch: number,
): ChatSuggestion[] {
	const suggestions = SUGGESTION_GROUPS[tab];
	const batchCount = Math.ceil(suggestions.length / SUGGESTIONS_PER_BATCH);
	const normalizedBatch = batch % batchCount;
	const start = normalizedBatch * SUGGESTIONS_PER_BATCH;
	return suggestions.slice(start, start + SUGGESTIONS_PER_BATCH);
}

function SuggestionList({
	disabled,
	onSelect,
	suggestions,
}: {
	disabled: boolean;
	onSelect: (prompt: string) => void;
	suggestions: ChatSuggestion[];
}) {
	return (
		<div className="flex flex-col gap-2">
			{suggestions.map(
				({ description, icon: SuggestionIcon, id, label, prompt }) => (
					<Suggestion
						className="group h-auto min-h-12 w-full justify-start gap-3 whitespace-normal rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-left font-normal text-foreground shadow-none hover:border-border hover:bg-muted/50"
						data-testid="chat-suggestion"
						disabled={disabled}
						key={id}
						onClick={onSelect}
						suggestion={prompt}
						title={prompt}
						variant="ghost"
					>
						<SuggestionIcon className="size-4 shrink-0 text-violet-500" />
						<span className="min-w-0 flex-1">
							<span className="block text-xs font-medium">{label}</span>
							<span className="mt-0.5 block text-[11px] text-muted-foreground">
								{description}
							</span>
						</span>
						<ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
					</Suggestion>
				),
			)}
		</div>
	);
}

export function ChatSuggestions({
	disabled,
	onSelect,
}: {
	disabled: boolean;
	onSelect: (prompt: string) => void;
}) {
	const [tab, setTab] = useState<SuggestionTab>("starter");
	const [batches, setBatches] = useState<Record<SuggestionTab, number>>({
		starter: 0,
		"generative-ui": 0,
	});
	const refreshLabel = tab === "starter" ? "Starter" : "Generative UI";

	const refresh = () => {
		setBatches((current) => ({
			...current,
			[tab]: current[tab] + 1,
		}));
	};

	return (
		<Tabs
			className="mt-3 gap-3"
			onValueChange={(value) => {
				if (value === "starter" || value === "generative-ui") {
					setTab(value);
				}
			}}
			value={tab}
		>
			<div className="flex items-center justify-between gap-2">
				<TabsList aria-label="Suggestion categories" className="h-8">
					<TabsTrigger className="px-3 text-xs" value="starter">
						Starter
					</TabsTrigger>
					<TabsTrigger className="px-3 text-xs" value="generative-ui">
						Generative UI
					</TabsTrigger>
				</TabsList>
				<Button
					aria-label={`Refresh ${refreshLabel} suggestions`}
					onClick={refresh}
					size="icon-sm"
					title={`Refresh ${refreshLabel} suggestions`}
					type="button"
					variant="ghost"
				>
					<RefreshCwIcon />
				</Button>
			</div>

			<TabsContent value="starter">
				<SuggestionList
					disabled={disabled}
					onSelect={onSelect}
					suggestions={visibleSuggestions("starter", batches.starter)}
				/>
			</TabsContent>
			<TabsContent value="generative-ui">
				<SuggestionList
					disabled={disabled}
					onSelect={onSelect}
					suggestions={visibleSuggestions(
						"generative-ui",
						batches["generative-ui"],
					)}
				/>
			</TabsContent>
		</Tabs>
	);
}
