import { useChat } from "@ai-sdk/react";
import {
	DefaultChatTransport,
	type DynamicToolUIPart,
	isToolOrDynamicToolUIPart,
	type PrepareSendMessagesRequest,
	type ToolUIPart,
	type UIMessage,
} from "ai";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
	AlertTriangleIcon,
	KeyRoundIcon,
	Loader2Icon,
	PanelLeftCloseIcon,
	RefreshCwIcon,
} from "lucide-react";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { StickToBottomContext } from "use-stick-to-bottom";
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
import { BrandMark } from "@/components/BrandMark";
import { BrandName } from "@/components/BrandName";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	type KeyboardShortcut,
	useKeyboardShortcuts,
} from "@/hooks/useKeyboardShortcuts";
import { cn } from "@/lib/utils";
import { ChangeSetReview } from "@/modules/agent-chat/ChangeSetReview";
import { useAgentChangeSessionStore } from "@/modules/agent-chat/change-session";
import { DemoCredentialSettings } from "@/modules/agent-chat/DemoCredentialSettings";
import {
	applyEphemeralProviderStatus,
	createEphemeralCredentialHolder,
	type EphemeralCredentialHolder,
	type EphemeralCredentialStatus,
	type EphemeralCredentials,
} from "@/modules/agent-chat/ephemeral-credentials";
import { ProviderModelSelector } from "@/modules/agent-chat/ProviderModelSelector";
import { resolveProviderSelection } from "@/modules/agent-chat/provider-selection";
import { collectResearchSources } from "@/modules/agent-chat/research";
import { useAgentChatSessionStore } from "@/modules/agent-chat/session-store";
import { projectCompletedAgentTools } from "@/modules/agent-chat/tool-projection";
import { useProviderCatalog } from "@/modules/agent-chat/use-provider-catalog";
import { ChatSuggestions } from "@/modules/chat/ChatSuggestions";
import {
	ResearchCitationFooter,
	ResearchToolResult,
} from "@/modules/chat/ResearchToolResult";
import { useEditor } from "@/modules/editor/store";
import { useLayoutStore } from "@/modules/layout/store";
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
const SPEC_DATA_PART_TYPE = "data-spec";
const GenerativeUIMessage = lazy(() =>
	import("@/modules/generative-ui/GenerativeUIMessage").then((module) => ({
		default: module.GenerativeUIMessage,
	})),
);

class AgentRunToken {
	#value: string | null = null;

	set(value: string | null) {
		this.#value = value;
	}

	get(): string | null {
		return this.#value;
	}
}

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
	const isResearchTool = name === "web_search" || name === "weather_search";
	const isComplete =
		part.state === "output-available" ||
		part.state === "output-error" ||
		part.state === "output-denied";
	const shouldOpen = !isComplete || Boolean(changeSet);
	const [isOpen, setIsOpen] = useState(shouldOpen);

	useEffect(() => {
		setIsOpen(shouldOpen);
	}, [shouldOpen]);

	return (
		<Tool onOpenChange={setIsOpen} open={isOpen}>
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
				{!isResearchTool || output === undefined ? (
					<ToolInput input={part.input} />
				) : null}
				{changeSet ? (
					<ChangeSetReview
						changeSet={changeSet}
						key={changeSet.id}
						onRegenerate={onRegenerate}
					/>
				) : isResearchTool && output !== undefined ? (
					<ResearchToolResult output={output} toolName={name} />
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
	const sources =
		message.role === "assistant" ? collectResearchSources(message.parts) : [];
	const firstSpecPartIndex = message.parts.findIndex(
		(part) => part.type === SPEC_DATA_PART_TYPE,
	);

	return (
		<Message from={message.role}>
			<MessageContent>
				{message.parts.map((part, index) => {
					if (part.type === SPEC_DATA_PART_TYPE) {
						if (index !== firstSpecPartIndex) return null;
						return (
							<Suspense
								fallback={
									<div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
										Loading generated interface…
									</div>
								}
								key={`${message.id}:spec`}
							>
								<GenerativeUIMessage
									isStreaming={isStreaming}
									parts={message.parts}
								/>
							</Suspense>
						);
					}
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
								isStreaming={isStreaming && index === message.parts.length - 1}
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
				<ResearchCitationFooter sources={sources} />
			</MessageContent>
		</Message>
	);
}

interface AgentChatPaneProps {
	sessionId: string;
	credentialHolder: EphemeralCredentialHolder;
	credentialStatus: EphemeralCredentialStatus;
	onSaveCredentials(credentials: EphemeralCredentials): void;
	onClearCredentials(): void;
}

function AgentChatPane({
	sessionId,
	credentialHolder,
	credentialStatus,
	onSaveCredentials,
	onClearCredentials,
}: AgentChatPaneProps) {
	const reduceMotion = useReducedMotion();
	const composerRef = useRef<HTMLTextAreaElement>(null);
	const conversationRef = useRef<StickToBottomContext>(null);
	const processedToolCallIdsRef = useRef(new Set<string>());
	const [activeRunToken] = useState(() => new AgentRunToken());
	const {
		providers: serverProviders,
		hostedChat,
		isLoading,
		error: catalogError,
		reload,
	} = useProviderCatalog();
	const providers = useMemo(
		() => applyEphemeralProviderStatus(serverProviders, credentialStatus),
		[credentialStatus, serverProviders],
	);
	const [preferredSelection, setPreferredSelection] =
		useState<ModelSelection | null>(readStoredSelection);
	const [snapshotOmissions, setSnapshotOmissions] = useState<
		SnapshotOmission[]
	>([]);
	const [composerText, setComposerText] = useState("");
	const [hasAttachments, setHasAttachments] = useState(false);
	const handleAttachmentsChange = useCallback(
		(files: PromptInputMessage["files"]) => setHasAttachments(files.length > 0),
		[],
	);
	const selection = useMemo(
		() => resolveProviderSelection(providers, preferredSelection),
		[providers, preferredSelection],
	);
	const providerId = selection?.providerId;
	const modelId = selection?.modelId;
	const selectedProvider = providers.find(
		(provider) => provider.id === selection?.providerId,
	);
	const deploymentEnabled = hostedChat?.enabled ?? false;
	const canSend =
		deploymentEnabled && Boolean(selection && selectedProvider?.configured);
	const hostedCredentialStatus = useMemo<EphemeralCredentialStatus>(
		() => ({
			deepseekConfigured: Boolean(
				serverProviders.find((provider) => provider.id === "deepseek")
					?.configured,
			),
			tavilyConfigured: hostedChat?.tavilyConfigured ?? false,
		}),
		[hostedChat?.tavilyConfigured, serverProviders],
	);

	const prepareSendMessagesRequest = useCallback<
		PrepareSendMessagesRequest<UIMessage>
	>(
		async ({ messages, trigger, messageId }) => {
			if (!providerId || !modelId) {
				throw new Error("No AI model is selected");
			}
			useAgentChangeSessionStore.getState().clear();
			const preflight = await browserWorkspace.getSnapshot();
			useAgentChangeSessionStore.getState().begin(preflight.snapshot);
			activeRunToken.set(useAgentChangeSessionStore.getState().runId);
			setSnapshotOmissions(preflight.omissions);
			const storedCredentials = credentialHolder.read();
			const ephemeralCredentials: EphemeralCredentials = {
				deepseekApiKey:
					providerId === "deepseek"
						? storedCredentials.deepseekApiKey
						: undefined,
				tavilyApiKey: storedCredentials.tavilyApiKey,
			};
			const hasEphemeralCredentials = Boolean(
				ephemeralCredentials.deepseekApiKey ||
					ephemeralCredentials.tavilyApiKey,
			);
			return {
				body: {
					messages,
					trigger,
					messageId,
					providerId,
					modelId,
					workspace: preflight.snapshot,
					...(hasEphemeralCredentials ? { ephemeralCredentials } : {}),
				},
			};
		},
		[activeRunToken, credentialHolder, providerId, modelId],
	);
	const transport = useMemo(
		() =>
			new DefaultChatTransport<UIMessage>({
				api: "/api/chat",
				prepareSendMessagesRequest,
			}),
		[prepareSendMessagesRequest],
	);
	const projectMessages = useCallback(
		(nextMessages: UIMessage[]) => {
			const openedPath = projectCompletedAgentTools(
				nextMessages,
				processedToolCallIdsRef.current,
				activeRunToken.get(),
			);
			if (openedPath) {
				useEditor.getState().openFile(openedPath);
			}
		},
		[activeRunToken],
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
		onFinish: ({ messages: finishedMessages }) => {
			const runId = activeRunToken.get();
			projectMessages(finishedMessages);
			const session = useAgentChangeSessionStore.getState();
			if (!runId || session.runId !== runId) return;
			if (
				session.phase !== "finalized" ||
				session.changeSet?.changes.length === 0
			) {
				session.clear();
			}
		},
	});
	const generating = status === "submitted" || status === "streaming";
	const setChatVisible = useLayoutStore((state) => state.setChatVisible);
	const stopRun = useCallback(async () => {
		const runId = activeRunToken.get();
		await stop();
		const session = useAgentChangeSessionStore.getState();
		if (runId && session.runId === runId) session.clear();
	}, [activeRunToken, stop]);
	useEffect(() => () => void stopRun(), [stopRun]);
	const clearDemoCredentials = useCallback(async () => {
		await stopRun();
		onClearCredentials();
	}, [onClearCredentials, stopRun]);
	const submitReady =
		canSend &&
		status === "ready" &&
		(composerText.trim().length > 0 || hasAttachments);
	const stopShortcuts = useMemo<KeyboardShortcut[]>(
		() => [
			{
				action: (event) => {
					if (event.defaultPrevented || event.repeat) return;
					event.preventDefault();
					void stopRun();
				},
				altKey: false,
				ctrlKey: false,
				key: "Escape",
				metaKey: false,
				preventDefault: false,
				shiftKey: false,
			},
		],
		[stopRun],
	);
	useKeyboardShortcuts(stopShortcuts, generating);
	const discardAllRequested = useAgentChangeSessionStore(
		(state) => state.discardAllRequested,
	);

	useEffect(() => {
		projectMessages(messages);
	}, [messages, projectMessages]);

	useEffect(() => {
		if (!discardAllRequested) return;
		if (generating) void stopRun();
		else useAgentChangeSessionStore.getState().clear();
	}, [discardAllRequested, generating, stopRun]);

	const selectModel = (next: ModelSelection) => {
		setPreferredSelection(next);
		storeSelection(next);
	};
	const submit = async ({ text, files }: PromptInputMessage) => {
		const prompt = text.trim();
		if ((!prompt && files.length === 0) || !canSend || generating) return;
		setComposerText("");
		clearError();
		void conversationRef.current?.scrollToBottom();
		await sendMessage({ text: prompt, files });
	};
	const fillComposer = useCallback(
		(prompt: string) => {
			const composer = composerRef.current;
			if (!composer || !canSend || generating) return;
			composer.value = prompt;
			setComposerText(prompt);
			composer.focus();
			composer.setSelectionRange(prompt.length, prompt.length);
		},
		[canSend, generating],
	);
	const clearConversation = async () => {
		if (generating) await stopRun();
		else useAgentChangeSessionStore.getState().clear();
		processedToolCallIdsRef.current.clear();
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
			{!isLoading && !catalogError && hostedChat?.enabled === false && (
				<div className="flex gap-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
					<AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
					<span>
						Chat is disabled by deployment. Set CHAT_ENABLED=true and redeploy
						to accept new requests.
					</span>
				</div>
			)}
			{deploymentEnabled &&
				!isLoading &&
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
						disabled={!canSend}
						onClick={() => {
							if (!canSend) return;
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
				className={cn(
					"[&_[data-slot=input-group]]:border-border/70 [&_[data-slot=input-group]]:bg-card/80 [&_[data-slot=input-group]]:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.12)] [&_[data-slot=input-group]]:transition-[border-color,background-color,box-shadow] [&_[data-slot=input-group]]:duration-200 [&_[data-slot=input-group]]:hover:border-violet-400/30 [&_[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:border-violet-500/50 [&_[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:ring-4 [&_[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:ring-violet-500/10 [&_[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:shadow-[0_10px_30px_-18px_rgba(109,40,217,0.35)] dark:[&_[data-slot=input-group]]:hover:border-violet-400/30 dark:[&_[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:border-violet-400/50 dark:[&_[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:ring-violet-400/15",
					prominent
						? "[&_[data-slot=input-group]]:rounded-2xl"
						: "[&_[data-slot=input-group]]:rounded-xl",
				)}
				onAttachmentsChange={handleAttachmentsChange}
				onSubmit={submit}
			>
				<PromptInputBody>
					<PromptInputTextarea
						className={prominent ? "min-h-20 px-4 pt-4 text-sm" : undefined}
						disabled={!canSend || generating}
						onChange={(event) => setComposerText(event.currentTarget.value)}
						placeholder={
							catalogError
								? "Provider configuration unavailable"
								: isLoading
									? "Loading provider configuration…"
									: !deploymentEnabled
										? "Chat disabled by deployment"
										: canSend
											? "Describe what you want to build…"
											: "Configure a provider key to start"
						}
						ref={composerRef}
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
								? "rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-950 dark:hover:bg-white"
								: "rounded-lg"
						}
						disabled={!generating && !submitReady}
						onStop={() => void stopRun()}
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
			className="flex h-full min-w-0 flex-col bg-background text-foreground"
			id={TOUR_STEP_IDS.CHAT_PANE}
		>
			<header className="flex h-10 shrink-0 items-center gap-1 border-b border-border-primary px-3">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<BrandMark className="size-5" />
					<BrandName className="text-[13px]" />
					{generating && (
						<Loader2Icon
							aria-label="Agent is working"
							className="size-3.5 animate-spin text-fg-muted"
						/>
					)}
				</div>
				<DemoCredentialSettings
					deploymentEnabled={deploymentEnabled}
					deploymentKnown={hostedChat !== null}
					hostedStatus={hostedCredentialStatus}
					onClear={clearDemoCredentials}
					onSave={onSaveCredentials}
					pageStatus={credentialStatus}
				/>
				<TooltipProvider delayDuration={300}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								aria-label="Clear conversation"
								className="text-fg-muted hover:bg-bg-tertiary hover:text-fg-primary"
								disabled={messages.length === 0 && !error}
								onClick={() => void clearConversation()}
								size="icon-sm"
								variant="ghost"
							>
								<RefreshCwIcon />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Clear conversation</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								aria-label="Hide chat panel"
								className="text-fg-muted hover:bg-bg-tertiary hover:text-fg-primary"
								onClick={() => setChatVisible(false)}
								size="icon-sm"
								variant="ghost"
							>
								<PanelLeftCloseIcon />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Hide Chat (⌘1)</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</header>

			<LayoutGroup id={`agent-chat-${sessionId}`}>
				<Conversation contextRef={conversationRef}>
					<ConversationContent
						className={messages.length === 0 ? "min-h-full p-0" : undefined}
					>
						{messages.length === 0 ? (
							<ConversationEmptyState className="min-h-full justify-start overflow-y-auto px-4 py-6">
								<div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center py-6">
									<BrandMark className="size-14" />
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
												Try a prompt
											</p>
											<div className="h-px flex-1 bg-border" />
										</div>

										<ChatSuggestions
											disabled={!canSend || generating}
											onSelect={fillComposer}
										/>
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
									onRegenerate={
										canSend
											? () => {
													clearError();
													void regenerate({ messageId: message.id });
												}
											: undefined
									}
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
	const [credentialHolder] = useState(createEphemeralCredentialHolder);
	const [credentialStatus, setCredentialStatus] = useState(
		credentialHolder.status,
	);
	const saveCredentials = useCallback(
		(credentials: EphemeralCredentials) => {
			setCredentialStatus(credentialHolder.update(credentials));
		},
		[credentialHolder],
	);
	const clearCredentials = useCallback(() => {
		setCredentialStatus(credentialHolder.clear());
	}, [credentialHolder]);

	return (
		<AgentChatPane
			credentialHolder={credentialHolder}
			credentialStatus={credentialStatus}
			key={sessionId}
			onClearCredentials={clearCredentials}
			onSaveCredentials={saveCredentials}
			sessionId={sessionId}
		/>
	);
}
