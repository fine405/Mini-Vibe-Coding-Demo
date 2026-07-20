import { motion } from "framer-motion";
import { useState } from "react";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
	type ChatSuggestion,
	SUGGESTION_GROUPS,
	type SuggestionTab,
} from "@/modules/chat/suggestion-prompts";
import { useThemeStore } from "@/modules/theme/store";
import type { ResolvedTheme } from "@/modules/theme/types";

const SUGGESTION_TABS: Array<{ id: SuggestionTab; label: string }> = [
	{ id: "starter", label: "Starter" },
	{ id: "generative-ui", label: "Generative UI" },
	{ id: "trading", label: "Trading" },
];

function SuggestionCard({
	disabled,
	duplicate,
	onSelect,
	resolvedTheme,
	suggestion,
}: {
	disabled: boolean;
	duplicate: boolean;
	onSelect: (prompt: string) => void;
	resolvedTheme: ResolvedTheme;
	suggestion: ChatSuggestion;
}) {
	const {
		description,
		icon: SuggestionIcon,
		images,
		label,
		prompt,
	} = suggestion;
	const imageSrc = images[resolvedTheme];

	return (
		<Suggestion
			aria-label={`${label}. ${description}`}
			className="chat-suggestion-card group h-28 w-72 min-w-0 shrink-0 items-stretch justify-start overflow-hidden whitespace-normal rounded-xl border p-0 text-left font-normal text-foreground focus-visible:border-ring/70 focus-visible:ring-2 focus-visible:ring-ring/20"
			data-testid={duplicate ? undefined : "chat-suggestion"}
			disabled={disabled}
			onClick={onSelect}
			suggestion={prompt}
			tabIndex={duplicate ? -1 : undefined}
			title={prompt}
			variant="ghost"
		>
			<span className="flex h-full w-full min-w-0">
				<span
					aria-hidden="true"
					className="chat-suggestion-media relative flex h-full aspect-[4/3] shrink-0 items-center justify-center overflow-hidden border-r"
				>
					{imageSrc ? (
						<img
							alt=""
							className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
							height={480}
							loading="lazy"
							src={imageSrc}
							width={640}
						/>
					) : (
						<SuggestionIcon className="size-6 text-accent-hover/75 transition-colors duration-300 group-hover:text-accent-hover motion-reduce:transition-none" />
					)}
				</span>
				<span className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
					<span className="block text-xs leading-4 font-semibold">{label}</span>
					<span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
						{description}
					</span>
				</span>
			</span>
		</Suggestion>
	);
}

function SuggestionList({
	disabled,
	onSelect,
	resolvedTheme,
	suggestions,
}: {
	disabled: boolean;
	onSelect: (prompt: string) => void;
	resolvedTheme: ResolvedTheme;
	suggestions: ChatSuggestion[];
}) {
	const rows = [
		suggestions.filter((_, index) => index % 2 === 0),
		suggestions.filter((_, index) => index % 2 === 1),
	];

	return (
		<div className="chat-suggestion-marquee" role="group">
			{rows.map((row, rowIndex) => (
				<div
					className="chat-suggestion-marquee-track"
					data-direction={rowIndex === 0 ? "forward" : "reverse"}
					data-testid="chat-suggestion-row"
					key={rowIndex === 0 ? "even" : "odd"}
				>
					{[false, true].map((duplicate) => (
						<div
							aria-hidden={duplicate ? true : undefined}
							className="chat-suggestion-marquee-group"
							data-marquee-copy={duplicate ? "duplicate" : "original"}
							key={duplicate ? "duplicate" : "original"}
						>
							{row.map((suggestion) => (
								<SuggestionCard
									disabled={disabled}
									duplicate={duplicate}
									key={`${suggestion.id}-${duplicate ? "duplicate" : "original"}`}
									onSelect={onSelect}
									resolvedTheme={resolvedTheme}
									suggestion={suggestion}
								/>
							))}
						</div>
					))}
				</div>
			))}
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
	const [tab, setTab] = useState<SuggestionTab>("trading");
	const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

	return (
		<Tabs className="mt-3 gap-3" value={tab}>
			<div
				aria-label="Suggestion categories"
				className="mx-auto flex w-fit max-w-full min-w-0 items-center justify-center gap-0.5 overflow-x-auto rounded-lg bg-bg-secondary p-0.5"
				role="tablist"
			>
				{SUGGESTION_TABS.map((suggestionTab) => {
					const active = tab === suggestionTab.id;
					return (
						<button
							aria-selected={active}
							className={cn(
								"relative flex h-6 shrink-0 items-center rounded-md px-2 text-[11px] font-medium whitespace-nowrap transition-colors sm:text-xs",
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

			{SUGGESTION_TABS.map((suggestionTab) => (
				<TabsContent key={suggestionTab.id} value={suggestionTab.id}>
					<div className="chat-suggestion-backdrop animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
						<SuggestionList
							disabled={disabled}
							onSelect={onSelect}
							resolvedTheme={resolvedTheme}
							suggestions={SUGGESTION_GROUPS[suggestionTab.id]}
						/>
					</div>
				</TabsContent>
			))}
		</Tabs>
	);
}
