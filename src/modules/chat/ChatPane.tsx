import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
	Bot,
	ChevronLeft,
	ChevronRight,
	Loader2,
	RotateCcw,
	Send,
	Sparkles,
	User,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useFs } from "@/modules/fs/store";
import { applyPatchToFs } from "@/modules/patches/apply";
import { loadPatches, matchPatchByTrigger } from "@/modules/patches/loader";
import type { Patch } from "@/modules/patches/types";
import { cn } from "@/utils/cn";
import { DiffReviewModal } from "./DiffReviewModal";
import { useChatStore } from "./store";

export function ChatPane() {
	const { messages, isLoading, addMessage, setLoading } = useChatStore();
	const { filesByPath, setFiles, revertAllChanges, getModifiedFiles } = useFs();
	const [input, setInput] = useState("");
	const [patches, setPatches] = useState<Patch[]>([]);
	const [reviewingPatch, setReviewingPatch] = useState<Patch | null>(null);
	const [showSuggestions, setShowSuggestions] = useState(true);
	const scrollRef = useRef<HTMLDivElement>(null);
	const suggestionsScrollRef = useRef<HTMLDivElement>(null);

	// Load patches on mount
	useEffect(() => {
		loadPatches().then(setPatches);
	}, []);

	// Auto-scroll to bottom when messages change
	// biome-ignore lint/correctness/useExhaustiveDependencies: only want to trigger on messages change
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const handleSend = async () => {
		const trimmedInput = input.trim();
		if (!trimmedInput || isLoading) return;

		// Add user message
		addMessage({ role: "user", content: trimmedInput });
		setInput("");
		setLoading(true);

		// Simulate AI thinking delay
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Try to match a patch
		const matchedPatch = matchPatchByTrigger(patches, trimmedInput);

		if (matchedPatch) {
			// Add assistant message with patch
			addMessage({
				role: "assistant",
				content: `I can help you with that! ${matchedPatch.summary}`,
				patch: matchedPatch,
			});
			// Open diff review modal
			setReviewingPatch(matchedPatch);
		} else {
			// No match found
			addMessage({
				role: "assistant",
				content:
					"I don't have a pre-built solution for that yet. Try asking for 'create a react todo app' or similar requests.",
			});
		}

		setLoading(false);
	};

	const handleAcceptPatch = (selectedIndices?: Set<number>) => {
		if (!reviewingPatch) return;

		// Apply patch to FS using the applyPatchToFs function
		const result = applyPatchToFs(filesByPath, reviewingPatch, selectedIndices);

		if (result.success) {
			// Get the updated filesByPath by reapplying changes
			const newFilesByPath = { ...filesByPath };
			const changesToApply = selectedIndices
				? reviewingPatch.changes.filter((_, i) => selectedIndices.has(i))
				: reviewingPatch.changes;

			for (const change of changesToApply) {
				switch (change.op) {
					case "create":
						newFilesByPath[change.path] = {
							path: change.path,
							content: change.content || "",
							status: "new",
						};
						break;
					case "update": {
						const existing = newFilesByPath[change.path];
						if (existing) {
							newFilesByPath[change.path] = {
								...existing,
								content: change.content || "",
								status: "modified",
								// Store original content for revert/diff if not already stored
								originalContent:
									existing.originalContent ??
									(existing.status === "clean" ? existing.content : undefined),
							};
						}
						break;
					}
					case "delete":
						delete newFilesByPath[change.path];
						break;
				}
			}

			setFiles(newFilesByPath);
			setReviewingPatch(null);

			// Add confirmation message
			const appliedCount =
				selectedIndices?.size ?? reviewingPatch.changes.length;

			toast.success(
				`Applied ${appliedCount} of ${reviewingPatch.changes.length} changes`,
				{
					description: "Check the preview on the right",
				},
			);

			addMessage({
				role: "assistant",
				content: `✅ Applied ${appliedCount} of ${reviewingPatch.changes.length} changes successfully! Check the preview on the right.`,
				appliedPatch: true,
			});
		} else {
			// Handle error
			toast.error("Failed to apply changes", {
				description: result.error,
			});

			addMessage({
				role: "assistant",
				content: `❌ Failed to apply changes: ${result.error}`,
			});
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			handleSend();
		}
	};

	const sendDisabled = !input.trim() || isLoading;

	const scrollSuggestions = (direction: "left" | "right") => {
		if (suggestionsScrollRef.current) {
			const scrollAmount = 200;
			const newScrollLeft =
				suggestionsScrollRef.current.scrollLeft +
				(direction === "right" ? scrollAmount : -scrollAmount);
			suggestionsScrollRef.current.scrollTo({
				left: newScrollLeft,
				behavior: "smooth",
			});
		}
	};

	return (
		<div className="h-full w-full flex flex-col border-r border-border-primary bg-bg-primary text-fg-primary">
			{/* Header */}
			<div className="shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border-primary">
				Chat
			</div>

			{/* Messages */}
			<ScrollArea.Root className="flex-1 overflow-hidden">
				<ScrollArea.Viewport
					className="h-full w-full overflow-y-auto"
					ref={scrollRef}
				>
					<div className="p-3 space-y-3">
						{messages.length === 0 && (
							<div className="text-xs text-fg-muted text-center py-8">
								<p className="mb-2">👋 Welcome to mini-lovable!</p>
								<p>Try asking: "create a react todo app"</p>
							</div>
						)}
						{messages.map((msg) => (
							<div
								key={msg.id}
								className={`flex gap-2.5 ${
									msg.role === "user" ? "flex-row-reverse" : ""
								}`}
							>
								{/* Avatar */}
								<div
									className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
										msg.role === "user"
											? "bg-accent/20 text-accent"
											: "bg-success/20 text-success"
									}`}
								>
									{msg.role === "user" ? (
										<User className="h-3.5 w-3.5" />
									) : (
										<Bot className="h-3.5 w-3.5" />
									)}
								</div>
								{/* Message */}
								<div
									className={`flex-1 min-w-0 ${
										msg.role === "user" ? "text-right" : ""
									}`}
								>
									<div
										className={`inline-block text-xs rounded-lg px-3 py-2 max-w-full ${
											msg.role === "user"
												? "bg-accent text-white rounded-br-sm"
												: "bg-bg-tertiary border border-border-primary text-fg-secondary rounded-bl-sm"
										}`}
									>
										<span className="whitespace-pre-wrap break-words">
											{msg.content}
										</span>
										{msg.appliedPatch && getModifiedFiles().length > 0 && (
											<button
												type="button"
												onClick={() => {
													const count = getModifiedFiles().length;
													revertAllChanges();
													toast.success(`Reverted ${count} file(s)`);
												}}
												className="mt-2 flex items-center gap-1 text-[10px] px-2 py-1 bg-warning/10 hover:bg-warning/20 border border-warning/30 rounded text-warning transition-colors"
											>
												<RotateCcw className="h-3 w-3" />
												Revert Changes
											</button>
										)}
									</div>
								</div>
							</div>
						))}
						{isLoading && (
							<div className="flex gap-2.5">
								<div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-success/20 text-success">
									<Bot className="h-3.5 w-3.5" />
								</div>
								<div className="flex items-center gap-1.5 text-xs text-fg-muted">
									<Loader2 className="h-3 w-3 animate-spin" />
									<span>Thinking...</span>
								</div>
							</div>
						)}
					</div>
				</ScrollArea.Viewport>
				<ScrollArea.Scrollbar
					orientation="vertical"
					className="flex w-1.5 touch-none select-none bg-bg-tertiary"
				>
					<ScrollArea.Thumb className="relative flex-1 rounded-full bg-fg-muted/20" />
				</ScrollArea.Scrollbar>
			</ScrollArea.Root>

			{/* Input */}
			<div className="shrink-0">
				{/* Suggestions */}
				{patches.length > 0 && showSuggestions && (
					<div className="relative  py-4">
						{/* Header with close button */}
						<div className="flex items-center justify-between px-4 mb-3">
							<div className="flex items-center gap-2">
								<Sparkles className="h-4 w-4 text-fg-muted" />
								<span className="text-sm font-normal text-fg-secondary">
									Suggestions
								</span>
							</div>
							<button
								type="button"
								onClick={() => setShowSuggestions(false)}
								className="p-1 hover:bg-bg-tertiary rounded transition-colors"
								title="Close suggestions"
							>
								<X className="h-4 w-4 text-fg-muted hover:text-fg-primary" />
							</button>
						</div>

						{/* Scrollable suggestions */}
						<div className="relative">
							{/* Left gradient mask */}
							<div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]/80 to-transparent z-[5] pointer-events-none" />

							{/* Left arrow */}
							<button
								type="button"
								onClick={() => scrollSuggestions("left")}
								className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-bg-tertiary rounded-full transition-colors"
								title="Scroll left"
							>
								<ChevronLeft className="h-3 w-3 text-fg-muted" />
							</button>

							{/* Suggestions container */}
							<div
								ref={suggestionsScrollRef}
								className="overflow-x-auto scroll-smooth hide-scrollbar"
							>
								<div className="flex gap-2 px-12">
									{patches.map((patch) => (
										<button
											key={patch.id}
											type="button"
											onClick={() => setInput(patch.trigger)}
											disabled={isLoading}
											className="shrink-0 text-[10px] px-2 py-1 bg-bg-tertiary hover:bg-bg-secondary rounded-full text-fg-secondary hover:text-fg-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap font-normal"
											title={patch.summary}
										>
											{patch.trigger}
										</button>
									))}
								</div>
							</div>

							{/* Right gradient mask */}
							<div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]/80 to-transparent z-[5] pointer-events-none" />

							{/* Right arrow */}
							<button
								type="button"
								onClick={() => scrollSuggestions("right")}
								className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-bg-tertiary rounded-full transition-colors"
								title="Scroll right"
							>
								<ChevronRight className="h-3 w-3 text-fg-muted" />
							</button>
						</div>
					</div>
				)}

				<div className="p-3">
					<div className="flex gap-2">
						<input
							type="text"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyPress}
							placeholder="Ask me to create something..."
							disabled={isLoading}
							className="flex-1 px-2.5 py-1.5 text-xs bg-bg-secondary border border-border-primary rounded focus:outline-none focus:ring-1 focus:ring-accent text-fg-primary placeholder:text-fg-muted disabled:opacity-50"
						/>
						<button
							type="button"
							onClick={handleSend}
							disabled={sendDisabled}
							className={cn(
								"py-1.5 px-4  bg-accent rounded text-white transition-colors`",
								{
									"hover:bg-accent-hover": !sendDisabled,
									"opacity-50 cursor-not-allowed": sendDisabled,
								},
							)}
							title="Send (⌘+Enter)"
						>
							<Send className="h-3.5 w-3.5" />
						</button>
					</div>
					<p className="text-[10px] text-fg-muted mt-1.5">
						Press ⌘+Enter to send
					</p>
				</div>
			</div>

			{/* Diff Review Modal */}
			{reviewingPatch && (
				<DiffReviewModal
					patch={reviewingPatch}
					onAccept={handleAcceptPatch}
					onCancel={() => setReviewingPatch(null)}
				/>
			)}
		</div>
	);
}
