import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
	Bot,
	ChevronLeft,
	ChevronRight,
	Loader2,
	RotateCcw,
	Send,
	Sparkles,
	Trash2,
	User,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFs } from "@/modules/fs/store";
import {
	applySelectedHunksAsync,
	parseHunksAsync,
} from "@/modules/patches/hunk";
import { loadPatches, matchPatchByTrigger } from "@/modules/patches/loader";
import type { Patch } from "@/modules/patches/types";
import { cn } from "@/utils/cn";
import { DiffReviewModal, type HunkSelection } from "./DiffReviewModal";
import { useChatStore } from "./store";

// Format timestamp to relative or absolute time
function formatTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);

	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;

	return new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function ChatPane() {
	const { messages, isLoading, addMessage, setLoading, clearMessages } =
		useChatStore();
	const { setFiles, revertAllChanges, getModifiedFiles, acceptAllChanges } =
		useFs();
	const [input, setInput] = useState("");
	const [patches, setPatches] = useState<Patch[]>([]);
	const [reviewingPatch, setReviewingPatch] = useState<Patch | null>(null);
	const [showSuggestions, setShowSuggestions] = useState(true);
	const [streamingText, setStreamingText] = useState("");
	const [isStreaming, setIsStreaming] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const suggestionsScrollRef = useRef<HTMLDivElement>(null);

	// Simulate streaming text output
	const streamText = useCallback((text: string): Promise<void> => {
		return new Promise((resolve) => {
			setIsStreaming(true);
			setStreamingText("");
			let index = 0;
			const chunkSize = 3; // Characters per tick
			const interval = setInterval(() => {
				if (index < text.length) {
					setStreamingText(text.slice(0, index + chunkSize));
					index += chunkSize;
				} else {
					clearInterval(interval);
					setIsStreaming(false);
					setStreamingText("");
					resolve();
				}
			}, 20);
		});
	}, []);

	// Load patches on mount
	useEffect(() => {
		loadPatches().then(setPatches);
	}, []);

	// Auto-scroll to bottom when messages change or streaming
	// biome-ignore lint/correctness/useExhaustiveDependencies: only want to trigger on messages/streaming change
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages, streamingText]);

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
			const responseText = `I can help you with that! ${matchedPatch.summary}`;
			// Stream the response
			await streamText(responseText);
			// Add assistant message with patch
			addMessage({
				role: "assistant",
				content: responseText,
				patch: matchedPatch,
			});
			// Open diff review modal
			setReviewingPatch(matchedPatch);
		} else {
			const responseText =
				"I don't have a pre-built solution for that yet. Try asking for 'create a react todo app' or similar requests.";
			// Stream the response
			await streamText(responseText);
			// No match found
			addMessage({
				role: "assistant",
				content: responseText,
			});
		}

		setLoading(false);
	};

	const handleAcceptPatch = async (
		_selectedIndices?: Set<number>,
		hunkSelection?: HunkSelection,
	) => {
		if (!reviewingPatch) return;

		try {
			// Accept any pending changes first, so this patch becomes a new checkpoint
			// This ensures revert only undoes THIS patch, not previous ones
			acceptAllChanges();

			// Get fresh filesByPath after accepting changes
			const currentFiles = useFs.getState().filesByPath;
			const newFilesByPath = { ...currentFiles };
			let appliedHunksCount = 0;
			let totalHunksCount = 0;

			// Process each file change
			for (let i = 0; i < reviewingPatch.changes.length; i++) {
				const change = reviewingPatch.changes[i];
				const fileHunkSelection = hunkSelection?.get(i);

				// Skip if file is not selected (no hunks selected)
				if (fileHunkSelection && fileHunkSelection.size === 0) {
					continue;
				}

				const oldContent = currentFiles[change.path]?.content || "";
				const newContent = change.content || "";

				// Parse hunks for this file (async for large files)
				const parsed = await parseHunksAsync(
					oldContent,
					newContent,
					change.path,
					change.op,
				);
				totalHunksCount += parsed.hunks.length;

				// Determine which hunks to apply
				const hunksToApply =
					fileHunkSelection || new Set(parsed.hunks.map((h) => h.index));
				appliedHunksCount += hunksToApply.size;

				// Check if all hunks are selected (full file apply)
				const allHunksSelected = hunksToApply.size === parsed.hunks.length;

				switch (change.op) {
					case "create":
						if (hunksToApply.has(0)) {
							newFilesByPath[change.path] = {
								path: change.path,
								content: newContent,
								status: "new",
							};
						}
						break;

					case "update": {
						const existing = newFilesByPath[change.path];
						if (existing) {
							// Apply selected hunks to get final content (async for large files)
							const finalContent = allHunksSelected
								? newContent
								: await applySelectedHunksAsync(
										oldContent,
										parsed,
										hunksToApply,
									);

							// Always save current content as originalContent before applying new patch
							// This ensures revert goes back to the state before THIS patch
							newFilesByPath[change.path] = {
								...existing,
								content: finalContent,
								status: "modified",
								originalContent: existing.content,
							};
						}
						break;
					}

					case "delete":
						if (hunksToApply.has(0)) {
							delete newFilesByPath[change.path];
						}
						break;
				}
			}

			setFiles(newFilesByPath);
			setReviewingPatch(null);

			// Build confirmation message
			const message =
				appliedHunksCount === totalHunksCount
					? `Applied all ${appliedHunksCount} hunks`
					: `Applied ${appliedHunksCount} of ${totalHunksCount} hunks`;

			toast.success(message, {
				description: "Check the preview on the right",
			});

			addMessage({
				role: "assistant",
				content: `✅ ${message} successfully! Check the preview on the right.`,
				appliedPatch: true,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			toast.error("Failed to apply changes", {
				description: errorMessage,
			});

			addMessage({
				role: "assistant",
				content: `❌ Failed to apply changes: ${errorMessage}`,
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
		<div className="h-full w-full flex flex-col border-r border-border-primary bg-bg-primary text-fg-primary animate-fade-in">
			{/* Header */}
			<div className="shrink-0 px-3 py-2 flex items-center justify-between border-b border-border-primary">
				<span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
					Chat
				</span>
				{messages.length > 0 && (
					<TooltipProvider delayDuration={300}>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => {
										clearMessages();
										toast.success("Chat cleared");
									}}
									className="p-1 hover:bg-bg-tertiary rounded transition-colors group"
								>
									<Trash2 className="h-3.5 w-3.5 text-fg-muted group-hover:text-fg-primary" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom">Clear chat</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</div>

			{/* Messages */}
			<ScrollArea.Root className="flex-1 overflow-hidden">
				<ScrollArea.Viewport
					className="h-full w-full overflow-y-auto"
					ref={scrollRef}
				>
					<div className="p-3 space-y-3">
						{messages.length === 0 && (
							<div className="flex flex-col items-center justify-center py-12 px-4">
								<div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mb-4">
									<Bot className="h-6 w-6 text-pink-500" />
								</div>
								<h3 className="text-sm font-medium text-fg-primary mb-1">
									Welcome to Mini Lovable
								</h3>
								<p className="text-xs text-fg-muted text-center mb-4">
									Describe what you want to build and I'll help you create it.
								</p>
								<div className="flex flex-wrap gap-1.5 justify-center">
									{patches.slice(0, 3).map((patch) => (
										<button
											key={patch.id}
											type="button"
											onClick={() => setInput(patch.trigger)}
											className="text-[10px] px-2 py-1 bg-bg-tertiary hover:bg-bg-secondary rounded-full text-fg-secondary hover:text-fg-primary transition-all"
										>
											{patch.trigger}
										</button>
									))}
								</div>
							</div>
						)}
						{messages.map((msg, msgIndex) => {
							// Only show revert button on the last applied patch message
							const isLastAppliedPatch =
								msg.appliedPatch &&
								!messages.slice(msgIndex + 1).some((m) => m.appliedPatch);

							return (
								<div
									key={msg.id}
									className={`flex gap-2.5 ${
										msg.role === "user"
											? "flex-row-reverse animate-slide-in-right"
											: "animate-slide-in-left"
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
											{/* Timestamp */}
											<div
												className={`text-[10px] mt-1 ${
													msg.role === "user"
														? "text-white/60"
														: "text-fg-muted"
												}`}
											>
												{formatTime(msg.timestamp)}
											</div>
											{isLastAppliedPatch && getModifiedFiles().length > 0 && (
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
							);
						})}
						{/* Streaming message */}
						{isStreaming && streamingText && (
							<div className="flex gap-2.5 animate-slide-in-left">
								<div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-success/20 text-success">
									<Bot className="h-3.5 w-3.5" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="inline-block text-xs rounded-lg px-3 py-2 max-w-full bg-bg-tertiary border border-border-primary text-fg-secondary rounded-bl-sm relative overflow-hidden">
										<span className="whitespace-pre-wrap break-words">
											{streamingText}
											<span className="inline-block w-0.5 h-3.5 bg-fg-secondary ml-0.5 animate-pulse align-middle" />
										</span>
										{/* Fade gradient at the end */}
										<span className="absolute right-0 top-0 bottom-0 w-12 bg-linear-to-l from-bg-tertiary to-transparent pointer-events-none" />
									</div>
								</div>
							</div>
						)}
						{isLoading && !isStreaming && (
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
								"py-1.5 px-4 bg-accent rounded text-white transition-all btn-press",
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
