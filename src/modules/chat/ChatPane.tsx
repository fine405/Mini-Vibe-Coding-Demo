import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFs } from "@/modules/fs/store";
import { loadPatches, matchPatchByTrigger } from "@/modules/patches/loader";
import type { Patch } from "@/modules/patches/types";
import { cn } from "@/utils/cn";
import { DiffReviewModal } from "./DiffReviewModal";
import { useChatStore } from "./store";

export function ChatPane() {
	const { messages, isLoading, addMessage, setLoading } = useChatStore();
	const { filesByPath, setFiles } = useFs();
	const [input, setInput] = useState("");
	const [patches, setPatches] = useState<Patch[]>([]);
	const [reviewingPatch, setReviewingPatch] = useState<Patch | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	// Load patches on mount
	useEffect(() => {
		loadPatches().then(setPatches);
	}, []);

	// Auto-scroll to bottom when messages change
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
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

	const handleAcceptPatch = () => {
		if (!reviewingPatch) return;

		// Apply patch to FS
		const newFilesByPath = { ...filesByPath };
		for (const change of reviewingPatch.changes) {
			switch (change.op) {
				case "create":
					newFilesByPath[change.path] = {
						path: change.path,
						content: change.content || "",
						status: "new",
					};
					break;
				case "update":
					if (newFilesByPath[change.path]) {
						newFilesByPath[change.path] = {
							...newFilesByPath[change.path],
							content: change.content || "",
							status: "modified",
						};
					}
					break;
				case "delete":
					delete newFilesByPath[change.path];
					break;
			}
		}

		setFiles(newFilesByPath);
		setReviewingPatch(null);

		// Add confirmation message
		addMessage({
			role: "assistant",
			content:
				"✅ Changes applied successfully! Check the preview on the right.",
		});
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			handleSend();
		}
	};

	const sendDisabled = !input.trim() || isLoading;

	return (
		<div className="h-full w-full flex flex-col border-r border-neutral-800/60 bg-neutral-950/80 text-neutral-100">
			{/* Header */}
			<div className="shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 border-b border-neutral-800/60">
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
							<div className="text-xs text-neutral-500 text-center py-8">
								<p className="mb-2">👋 Welcome to mini-lovable!</p>
								<p>Try asking: "create a react todo app"</p>
							</div>
						)}
						{messages.map((msg) => (
							<div
								key={msg.id}
								className={`text-xs ${
									msg.role === "user" ? "text-neutral-100" : "text-neutral-300"
								}`}
							>
								<div
									className={`font-medium text-[10px] uppercase tracking-wide mb-1 ${
										msg.role === "user" ? "text-blue-400" : "text-green-400"
									}`}
								>
									{msg.role === "user" ? "You" : "Assistant"}
								</div>
								<div
									className={`rounded px-2.5 py-2 ${
										msg.role === "user"
											? "bg-blue-500/10 border border-blue-500/20"
											: "bg-neutral-800/60 border border-neutral-700/60"
									}`}
								>
									{msg.content}
								</div>
							</div>
						))}
						{isLoading && (
							<div className="flex items-center gap-2 text-xs text-neutral-400">
								<Loader2 className="h-3 w-3 animate-spin" />
								<span>Thinking...</span>
							</div>
						)}
					</div>
				</ScrollArea.Viewport>
				<ScrollArea.Scrollbar
					orientation="vertical"
					className="flex w-1.5 touch-none select-none bg-neutral-900/80"
				>
					<ScrollArea.Thumb className="relative flex-1 rounded-full bg-neutral-600" />
				</ScrollArea.Scrollbar>
			</ScrollArea.Root>

			{/* Input */}
			<div className="shrink-0 p-3 border-t border-neutral-800/60">
				<div className="flex gap-2">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyPress}
						placeholder="Ask me to create something..."
						disabled={isLoading}
						className="flex-1 px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-100 placeholder:text-neutral-500 disabled:opacity-50"
					/>
					<button
						type="button"
						onClick={handleSend}
						disabled={sendDisabled}
						className={cn(
							"py-1.5 px-4  bg-blue-500 rounded text-white transition-colors`",
							{
								"hover:bg-blue-600": !sendDisabled,
								"opacity-50 cursor-not-allowed": sendDisabled,
							},
						)}
						title="Send (⌘+Enter)"
					>
						<Send className="h-3.5 w-3.5" />
					</button>
				</div>
				<p className="text-[10px] text-neutral-500 mt-1.5">
					Press ⌘+Enter to send
				</p>
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
