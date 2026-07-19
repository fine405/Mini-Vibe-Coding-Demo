import { motion } from "framer-motion";
import { ArrowRightIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
	type ChatSuggestion,
	SUGGESTION_GROUPS,
	type SuggestionTab,
} from "@/modules/chat/suggestion-prompts";

const SUGGESTION_TABS: Array<{ id: SuggestionTab; label: string }> = [
	{ id: "starter", label: "Starter" },
	{ id: "generative-ui", label: "Generative UI" },
];

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
		<Tabs className="mt-3 gap-3" value={tab}>
			<div className="flex items-center justify-between gap-2">
				<div
					aria-label="Suggestion categories"
					className="flex items-center gap-0.5 rounded-lg bg-bg-secondary p-0.5"
					role="tablist"
				>
					{SUGGESTION_TABS.map((suggestionTab) => {
						const active = tab === suggestionTab.id;
						return (
							<button
								aria-selected={active}
								className={cn(
									"relative flex h-6 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
									active
										? "text-fg-primary"
										: "text-fg-muted hover:text-fg-secondary",
								)}
								data-state={active ? "active" : "inactive"}
								key={suggestionTab.id}
								onClick={() => setTab(suggestionTab.id)}
								role="tab"
								type="button"
							>
								{active && (
									<motion.span
										className="absolute inset-0 rounded-md bg-bg-primary shadow-sm"
										layoutId="chat-suggestion-tab-pill"
										transition={{
											type: "spring",
											bounce: 0.2,
											duration: 0.4,
										}}
									/>
								)}
								<span className="relative z-10">{suggestionTab.label}</span>
							</button>
						);
					})}
				</div>
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

			{SUGGESTION_TABS.map((suggestionTab) => (
				<TabsContent key={suggestionTab.id} value={suggestionTab.id}>
					{/* Keying by batch replays the entrance animation on refresh. */}
					<div
						className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
						key={batches[suggestionTab.id]}
					>
						<SuggestionList
							disabled={disabled}
							onSelect={onSelect}
							suggestions={visibleSuggestions(
								suggestionTab.id,
								batches[suggestionTab.id],
							)}
						/>
					</div>
				</TabsContent>
			))}
		</Tabs>
	);
}
