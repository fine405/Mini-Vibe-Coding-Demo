import { useChat } from "@ai-sdk/react";
import {
	DefaultChatTransport,
	type DynamicToolUIPart,
	isToolOrDynamicToolUIPart,
	type ToolUIPart,
	type UIMessage,
} from "ai";
import {
	AlertTriangleIcon,
	BotIcon,
	KeyRoundIcon,
	RefreshCwIcon,
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

const starterPrompts = [
	"Review the current app and improve its UX",
	"Add a useful feature to this project",
	"Find and fix problems in the codebase",
];

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

			<Conversation>
				<ConversationContent>
					{messages.length === 0 ? (
						<ConversationEmptyState
							description="Ask for a feature, refactor, or bug fix. The agent can inspect and edit a shadow copy, then returns a reviewable ChangeSet."
							icon={<BotIcon className="size-7" />}
							title="Build with a real coding agent"
						>
							<div className="mt-3 flex w-full max-w-sm flex-col gap-2">
								{starterPrompts.map((prompt) => (
									<Button
										className="h-auto justify-start whitespace-normal text-left text-xs"
										disabled={!canSend}
										key={prompt}
										onClick={() => sendStarter(prompt)}
										variant="outline"
									>
										{prompt}
									</Button>
								))}
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

			<div className="shrink-0 space-y-2 border-t p-3">
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
								Configure a provider key in the server environment to enable
								chat.
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

				<PromptInput
					className="[&_[data-slot=input-group]]:rounded-xl"
					onSubmit={submit}
				>
					<PromptInputBody>
						<PromptInputTextarea
							disabled={!canSend || generating}
							placeholder={
								canSend
									? "Describe what you want to build…"
									: "Configure a provider key to start"
							}
						/>
					</PromptInputBody>
					<PromptInputFooter>
						<PromptInputTools className="min-w-0 flex-1">
							<ProviderModelSelector
								isLoading={isLoading}
								onSelect={selectModel}
								providers={providers}
								selection={selection}
							/>
						</PromptInputTools>
						<PromptInputSubmit
							disabled={!canSend}
							onStop={() => void stop()}
							status={status}
						/>
					</PromptInputFooter>
				</PromptInput>
			</div>
		</section>
	);
}

export function ChatPane() {
	const sessionId = useAgentChatSessionStore((state) => state.sessionId);
	return <AgentChatPane key={sessionId} sessionId={sessionId} />;
}
