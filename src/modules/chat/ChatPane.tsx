import { useChat } from "@ai-sdk/react";
import {
	DefaultChatTransport,
	type DynamicToolUIPart,
	isToolOrDynamicToolUIPart,
	type ToolUIPart,
	type UIMessage,
} from "ai";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
	AlertTriangleIcon,
	ArrowRightIcon,
	BotIcon,
	KeyRoundIcon,
	PlusIcon,
	RefreshCwIcon,
	SearchIcon,
	WrenchIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
	type ToolPart,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import {
	type KeyboardShortcut,
	useKeyboardShortcuts,
} from "@/hooks/useKeyboardShortcuts";
import { ChangeSetReview } from "@/modules/agent-chat/ChangeSetReview";
import { ProviderModelSelector } from "@/modules/agent-chat/ProviderModelSelector";
import { resolveProviderSelection } from "@/modules/agent-chat/provider-selection";
import { useAgentChatSessionStore } from "@/modules/agent-chat/session-store";
import { useProviderCatalog } from "@/modules/agent-chat/use-provider-catalog";
import type { ModelSelection } from "@/modules/providers/types";
import { TOUR_STEP_IDS } from "@/modules/tour/constants";
import { browserWorkspace } from "@/modules/workspace/browser";
import { workspaceChangeSetSchema } from "@/modules/workspace/schema";
import type {
	SnapshotOmission,
	SnapshotOmissionReason,
} from "@/modules/workspace/types";

const MODEL_SELECTION_STORAGE_KEY = "mini-lovable-agent-model";
const COMPOSER_TRANSITION = {
	duration: 0.42,
	ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};
const REDUCED_MOTION_TRANSITION = { duration: 0 };

const starterPrompts = [
	{
		icon: SearchIcon,
		prompt: "Review the current app and improve its UX",
	},
	{
		icon: PlusIcon,
		prompt: "Add a useful feature to this project",
	},
	{
		icon: WrenchIcon,
		prompt: "Find and fix problems in the codebase",
	},
] as const;

const omissionReasonLabels: Record<SnapshotOmissionReason, string> = {
	secret: "credential or secret path",
	"blocked-path": "generated or blocked path",
	binary: "binary content",
	"file-too-large": "exceeds the per-file Agent limit",
	"too-many-files": "exceeds the Agent file-count limit",
	"snapshot-too-large": "exceeds the total Agent snapshot limit",
};

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KiB`;
}

function SnapshotOmissionsNotice({
	omissions,
}: {
	omissions: SnapshotOmission[];
}) {
	if (omissions.length === 0) return null;
	return (
		<div
			className="space-y-1.5 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300"
			role="status"
		>
			<p className="font-medium">
				{omissions.length} workspace file(s) were excluded from this Agent run.
			</p>
			<ul className="max-h-28 space-y-1 overflow-auto">
				{omissions.map((omission) => (
					<li className="flex flex-wrap gap-x-1" key={omission.path}>
						<code className="break-all">{omission.path}</code>
						<span>
							— {omissionReasonLabels[omission.reason]} (
							{formatBytes(omission.bytes)})
						</span>
					</li>
				))}
			</ul>
			<p className="opacity-80">
				Remove or rename credential files, or reduce oversized files, to include
				them.
			</p>
		</div>
	);
}

function readStoredSelection(): ModelSelection | null {
	if (typeof window === "undefined") return null;
	try {
		const value: unknown = JSON.parse(
			window.localStorage.getItem(MODEL_SELECTION_STORAGE_KEY) ?? "null",
		);
		if (
			value &&
			typeof value === "object" &&
			typeof (value as ModelSelection).providerId === "string" &&
			typeof (value as ModelSelection).modelId === "string"
		) {
			return value as ModelSelection;
		}
	} catch {
		// Ignore malformed local preferences and use the catalog default.
	}
	return null;
}

function storeSelection(selection: ModelSelection) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(
		MODEL_SELECTION_STORAGE_KEY,
		JSON.stringify(selection),
	);
}

function parseChangeSet(output: unknown) {
	let candidate = output;
	if (typeof output === "string") {
		try {
			candidate = JSON.parse(output);
		} catch {
			return null;
		}
	}
	const parsed = workspaceChangeSetSchema.safeParse(candidate);
	return parsed.success ? parsed.data : null;
}

function toolName(part: ToolPart): string {
	return part.type === "dynamic-tool"
		? part.toolName
		: part.type.split("-").slice(1).join("-");
}

function ToolCall({
	part,
	onRegenerate,
}: {
	part: ToolPart;
	onRegenerate?(): void;
}) {
	const name = toolName(part);
	const changeSet =
		part.state === "output-available" && name === "finalize_changes"
			? parseChangeSet(part.output)
			: null;
	const output = part.state === "output-available" ? part.output : undefined;
	const errorText = part.state === "output-error" ? part.errorText : undefined;
	const defaultOpen = name === "finalize_changes" || Boolean(errorText);

	return (
		<Tool defaultOpen={defaultOpen}>
			{part.type === "dynamic-tool" ? (
				<ToolHeader
					state={part.state}
					title={name.replaceAll("_", " ")}
					toolName={part.toolName}
					type={part.type}
				/>
			) : (
				<ToolHeader
					state={part.state}
					title={name.replaceAll("_", " ")}
					type={part.type as ToolUIPart["type"]}
				/>
			)}
			<ToolContent>
				<ToolInput input={part.input} />
				{changeSet ? (
					<ChangeSetReview
						changeSet={changeSet}
						key={changeSet.id}
						onRegenerate={onRegenerate}
					/>
				) : (
					<ToolOutput errorText={errorText} output={output} />
				)}
			</ToolContent>
		</Tool>
	);
}

export function AgentChatMessage({
	message,
	isStreaming,
	onRegenerate,
}: {
	message: UIMessage;
	isStreaming: boolean;
	onRegenerate?(): void;
}) {
	return (
		<Message from={message.role}>
			<MessageContent>
				{message.parts.map((part, index) => {
					if (part.type === "text") {
						return message.role === "assistant" ? (
							<MessageResponse
								isAnimating={isStreaming}
								key={`${message.id}:text:${index}`}
							>
								{part.text}
							</MessageResponse>
						) : (
							<p
								className="whitespace-pre-wrap"
								key={`${message.id}:text:${index}`}
							>
								{part.text}
							</p>
						);
					}
					if (part.type === "reasoning") {
						return (
							<Reasoning
								isStreaming={isStreaming}
								key={`${message.id}:reasoning:${index}`}
							>
								<ReasoningTrigger />
								<ReasoningContent>{part.text}</ReasoningContent>
							</Reasoning>
						);
					}
					if (isToolOrDynamicToolUIPart(part)) {
						return (
							<ToolCall
								key={`${message.id}:tool:${part.toolCallId}`}
								onRegenerate={onRegenerate}
								part={part as ToolUIPart | DynamicToolUIPart}
							/>
						);
					}
					return null;
				})}
			</MessageContent>
		</Message>
	);
}

function AgentChatPane({ sessionId }: { sessionId: string }) {
	const reduceMotion = useReducedMotion();
	const {
		providers,
		isLoading,
		error: catalogError,
		reload,
	} = useProviderCatalog();
	const [preferredSelection, setPreferredSelection] =
		useState<ModelSelection | null>(readStoredSelection);
	const [snapshotOmissions, setSnapshotOmissions] = useState<
		SnapshotOmission[]
	>([]);
	const selection = useMemo(
		() => resolveProviderSelection(providers, preferredSelection),
		[providers, preferredSelection],
	);
	const providerId = selection?.providerId;
	const modelId = selection?.modelId;
	const selectedProvider = providers.find(
		(provider) => provider.id === selection?.providerId,
	);
	const canSend = Boolean(selection && selectedProvider?.configured);

	const transport = useMemo(
		() =>
			new DefaultChatTransport<UIMessage>({
				api: "/api/chat",
				prepareSendMessagesRequest: async ({
					messages,
					trigger,
					messageId,
				}) => {
					if (!providerId || !modelId) {
						throw new Error("No AI model is selected");
					}
					const preflight = await browserWorkspace.getSnapshot();
					setSnapshotOmissions(preflight.omissions);
					return {
						body: {
							messages,
							trigger,
							messageId,
							providerId,
							modelId,
							workspace: preflight.snapshot,
						},
					};
				},
			}),
		[providerId, modelId],
	);
	const {
		messages,
		status,
		error,
		sendMessage,
		stop,
		setMessages,
		clearError,
		regenerate,
	} = useChat({
		id: sessionId,
		transport,
		experimental_throttle: 50,
	});
	const generating = status === "submitted" || status === "streaming";
	const submitReady = canSend && status === "ready";
	const stopShortcuts = useMemo<KeyboardShortcut[]>(
		() => [
			{
				action: (event) => {
					if (event.defaultPrevented || event.repeat) return;
					event.preventDefault();
					void stop();
				},
				altKey: false,
				ctrlKey: false,
				key: "Escape",
				metaKey: false,
				preventDefault: false,
				shiftKey: false,
			},
		],
		[stop],
	);
	useKeyboardShortcuts(stopShortcuts, generating);

	const selectModel = (next: ModelSelection) => {
		setPreferredSelection(next);
		storeSelection(next);
	};
	const submit = async ({ text, files }: PromptInputMessage) => {
		const prompt = text.trim();
		if ((!prompt && files.length === 0) || !canSend || generating) return;
		clearError();
		await sendMessage({ text: prompt, files });
	};
	const sendStarter = (prompt: string) => {
		if (!canSend || generating) return;
		void sendMessage({ text: prompt });
	};
	const clearConversation = async () => {
		if (generating) await stop();
		setMessages([]);
		clearError();
	};
	const notices = (
		<>
			{catalogError && (
				<div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
					<AlertTriangleIcon className="size-4 shrink-0" />
					<span className="min-w-0 flex-1">{catalogError}</span>
					<Button onClick={reload} size="xs" variant="ghost">
						Retry
					</Button>
				</div>
			)}
			{!isLoading &&
				providers.length > 0 &&
				!providers.some((provider) => provider.configured) && (
					<div className="flex gap-2 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
						<KeyRoundIcon className="mt-0.5 size-3.5 shrink-0" />
						<span>
							Configure a provider key in the server environment to enable chat.
						</span>
					</div>
				)}
			<SnapshotOmissionsNotice omissions={snapshotOmissions} />
			{error && (
				<div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
					<span className="min-w-0 flex-1">{error.message}</span>
					<Button
						onClick={() => {
							clearError();
							void regenerate();
						}}
						size="xs"
						variant="ghost"
					>
						Retry
					</Button>
				</div>
			)}
		</>
	);
	const renderPromptInput = (prominent = false) => (
		<motion.div
			className="w-full"
			data-slot="agent-chat-composer"
			layoutId="agent-chat-composer"
			transition={
				reduceMotion ? REDUCED_MOTION_TRANSITION : COMPOSER_TRANSITION
			}
		>
			<PromptInput
				className={
					prominent
						? "[&_[data-slot=input-group]]:rounded-2xl [&_[data-slot=input-group]]:border-blue-500/40 [&_[data-slot=input-group]]:bg-card/50 [&_[data-slot=input-group]]:shadow-[0_20px_60px_-36px_rgba(37,99,235,0.8)]"
						: "[&_[data-slot=input-group]]:rounded-xl"
				}
				onSubmit={submit}
			>
				<PromptInputBody>
					<PromptInputTextarea
						className={prominent ? "min-h-20 px-4 pt-4 text-sm" : undefined}
						disabled={!canSend || generating}
						placeholder={
							canSend
								? "Describe what you want to build…"
								: "Configure a provider key to start"
						}
					/>
				</PromptInputBody>
				<PromptInputFooter className={prominent ? "px-3 pb-3" : undefined}>
					<PromptInputTools className="min-w-0 flex-1">
						<ProviderModelSelector
							isLoading={isLoading}
							onSelect={selectModel}
							providers={providers}
							selection={selection}
						/>
					</PromptInputTools>
					<PromptInputSubmit
						className={
							submitReady
								? "rounded-lg bg-blue-600 text-white hover:bg-blue-500"
								: "rounded-lg"
						}
						disabled={!canSend}
						onStop={() => void stop()}
						status={status}
						title={generating ? "Stop (Esc)" : undefined}
					/>
				</PromptInputFooter>
			</PromptInput>
		</motion.div>
	);

	return (
		<section
			aria-label="Coding agent"
			className="flex h-full min-w-0 flex-col border-r bg-background text-foreground"
			id={TOUR_STEP_IDS.CHAT_PANE}
		>
			<header className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
				<div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<BotIcon className="size-4" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">Coding Agent</p>
					<p className="truncate text-[11px] text-muted-foreground">
						{generating
							? "Working in an isolated workspace…"
							: "Changes require your approval"}
					</p>
				</div>
				<Button
					aria-label="Clear conversation"
					disabled={messages.length === 0 && !error}
					onClick={() => void clearConversation()}
					size="icon-sm"
					variant="ghost"
				>
					<RefreshCwIcon />
				</Button>
			</header>

			<LayoutGroup id={`agent-chat-${sessionId}`}>
				<Conversation>
					<ConversationContent
						className={messages.length === 0 ? "min-h-full p-0" : undefined}
					>
						{messages.length === 0 ? (
							<ConversationEmptyState className="min-h-full justify-start overflow-y-auto px-4 py-6">
								<div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center py-6">
									<div className="flex size-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_48px_-16px_rgba(59,130,246,0.9)]">
										<BotIcon className="size-7" />
									</div>
									<h2 className="mt-6 text-balance text-xl font-semibold tracking-tight">
										Build with a real coding agent
									</h2>
									<p className="mt-3 max-w-lg text-pretty text-sm leading-6 text-muted-foreground">
										Ask for a feature, refactor, or bug fix. The agent can
										inspect and edit a shadow copy, then returns a reviewable
										ChangeSet.
									</p>

									<div className="mt-8 w-full max-w-xl text-left">
										<div className="space-y-2">
											{notices}
											{renderPromptInput(true)}
										</div>

										<div className="mt-6 flex items-center gap-3">
											<div className="h-px flex-1 bg-border" />
											<p className="shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
												Try a starter
											</p>
											<div className="h-px flex-1 bg-border" />
										</div>

										<div className="mt-3 flex flex-col gap-2">
											{starterPrompts.map(({ icon: StarterIcon, prompt }) => (
												<Button
													className="group h-auto min-h-11 w-full justify-start gap-3 whitespace-normal rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-left text-xs font-normal text-foreground shadow-none hover:border-border hover:bg-muted/50"
													disabled={!canSend}
													key={prompt}
													onClick={() => sendStarter(prompt)}
													variant="ghost"
												>
													<StarterIcon className="size-4 shrink-0 text-blue-500" />
													<span className="min-w-0 flex-1">{prompt}</span>
													<ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
												</Button>
											))}
										</div>
									</div>
								</div>
							</ConversationEmptyState>
						) : (
							messages.map((message, index) => (
								<AgentChatMessage
									isStreaming={
										status === "streaming" && index === messages.length - 1
									}
									key={message.id}
									message={message}
									onRegenerate={() => {
										clearError();
										void regenerate({ messageId: message.id });
									}}
								/>
							))
						)}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>

				{messages.length > 0 && (
					<div className="shrink-0 space-y-2 border-t bg-background/95 p-3">
						{notices}
						{renderPromptInput()}
					</div>
				)}
			</LayoutGroup>
		</section>
	);
}

export function ChatPane() {
	const sessionId = useAgentChatSessionStore((state) => state.sessionId);
	return <AgentChatPane key={sessionId} sessionId={sessionId} />;
}
