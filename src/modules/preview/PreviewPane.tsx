import {
	SandpackPreview,
	SandpackProvider,
	useSandpack,
} from "@codesandbox/sandpack-react";
import { Loader2, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type AgentReviewSelections,
	useAgentChangeSessionStore,
} from "@/modules/agent-chat/change-session";
import {
	materializeAgentDraftFiles,
	materializeSelectedAgentDraftFiles,
} from "@/modules/preview/agentDraftFiles";
import { useSandpackConsoleBridge } from "@/modules/preview/consoleBridge";
import { useConsoleStore } from "@/modules/preview/consoleStore";
import { useThemeStore } from "@/modules/theme/store";
import { useBrowserWorkspaceFiles } from "@/modules/workspace/browser";
import type {
	WorkspaceChangeSet,
	WorkspaceFiles,
} from "@/modules/workspace/types";

function SandpackConsoleBridgeListener() {
	useSandpackConsoleBridge();
	return null;
}

function SandpackClientFileSync({
	onStalledFiles,
	sourceFiles,
}: {
	onStalledFiles: (files: PreviewFiles) => void;
	sourceFiles: Record<string, { code: string }>;
}) {
	const { sandpack } = useSandpack();
	const { clients, status } = sandpack;
	const lastObservedFilesRef = useRef(sourceFiles);

	useEffect(() => {
		if (status !== "running" || lastObservedFilesRef.current === sourceFiles) {
			return;
		}
		lastObservedFilesRef.current = sourceFiles;

		const currentClients = Object.values(clients);
		if (
			currentClients.length > 0 &&
			currentClients.every((client) => client.status === "done")
		) {
			return;
		}

		const timeout = window.setTimeout(() => onStalledFiles(sourceFiles), 200);
		return () => window.clearTimeout(timeout);
	}, [clients, onStalledFiles, sourceFiles, status]);

	return null;
}

function SandpackReadyListener({ onReady }: { onReady: () => void }) {
	const { listen } = useSandpack();
	const isReadyRef = useRef(false);

	useEffect(
		() =>
			listen((message) => {
				if (!isReadyRef.current && message.type === "done") {
					isReadyRef.current = true;
					onReady();
				}
			}),
		[listen, onReady],
	);

	return null;
}

type PreviewFiles = Record<string, { code: string }>;

interface PreviewRuntime {
	files: PreviewFiles;
	id: number;
}

interface ResolvedAgentDraft {
	changeSet: WorkspaceChangeSet;
	files: WorkspaceFiles | null;
	reviewSelections: AgentReviewSelections;
}

type PreviewMode = "current" | "draft";

function PreviewToolbar({
	hasDraft,
	isFullscreen,
	isRefreshing,
	onPreviewModeChange,
	onRefresh,
	onToggleFullscreen,
	previewMode,
}: {
	hasDraft: boolean;
	isFullscreen: boolean;
	isRefreshing: boolean;
	onPreviewModeChange: (mode: PreviewMode) => void;
	onRefresh: () => void;
	onToggleFullscreen: () => void;
	previewMode: PreviewMode;
}) {
	return (
		<div className="px-3 py-2 text-xs border-b border-border-primary flex items-center gap-2">
			{hasDraft && (
				<div
					aria-label="Preview source"
					className="flex rounded border border-border-secondary bg-bg-secondary p-0.5"
					role="group"
				>
					<button
						aria-pressed={previewMode === "current"}
						className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
							previewMode === "current"
								? "bg-bg-tertiary text-fg-primary"
								: "text-fg-muted hover:text-fg-primary"
						}`}
						onClick={() => onPreviewModeChange("current")}
						type="button"
					>
						Current
					</button>
					<button
						aria-pressed={previewMode === "draft"}
						className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
							previewMode === "draft"
								? "bg-accent/15 text-accent"
								: "text-fg-muted hover:text-fg-primary"
						}`}
						onClick={() => onPreviewModeChange("draft")}
						type="button"
					>
						Agent Draft
					</button>
				</div>
			)}

			{/* URL Bar */}
			<div className="flex-1 flex items-center gap-1.5 px-2 py-1 bg-bg-secondary rounded border border-border-secondary text-fg-muted">
				<div className="w-2 h-2 rounded-full bg-success/60" />
				<span className="text-[10px] font-mono truncate">localhost:3000</span>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-0.5">
				<button
					type="button"
					onClick={onRefresh}
					className="p-1.5 rounded hover:bg-bg-tertiary text-fg-muted hover:text-fg-primary transition-colors"
					title="Refresh (⌘R)"
				>
					<RefreshCw
						className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
					/>
				</button>
				<button
					type="button"
					onClick={onToggleFullscreen}
					className="p-1.5 rounded hover:bg-bg-tertiary text-fg-muted hover:text-fg-primary transition-colors"
					title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
				>
					{isFullscreen ? (
						<Minimize2 className="h-3.5 w-3.5" />
					) : (
						<Maximize2 className="h-3.5 w-3.5" />
					)}
				</button>
			</div>
		</div>
	);
}

export function PreviewPane() {
	const filesByPath = useBrowserWorkspaceFiles();
	const agentRunId = useAgentChangeSessionStore((state) => state.runId);
	const agentBaseFiles = useAgentChangeSessionStore((state) => state.baseFiles);
	const agentChangesByPath = useAgentChangeSessionStore(
		(state) => state.changesByPath,
	);
	const discardedAgentPaths = useAgentChangeSessionStore(
		(state) => state.discardedPaths,
	);
	const agentChangeSet = useAgentChangeSessionStore((state) => state.changeSet);
	const agentReviewSelections = useAgentChangeSessionStore(
		(state) => state.reviewSelections,
	);
	const { resolvedTheme } = useThemeStore();
	const workspaceFiles = useMemo(
		() =>
			Object.fromEntries(
				Object.entries(filesByPath).map(([path, file]) => [
					path,
					{ code: file.content },
				]),
			),
		[filesByPath],
	);
	const projectedAgentDraftContents = useMemo(
		() =>
			materializeAgentDraftFiles({
				baseFiles: agentBaseFiles,
				changesByPath: agentChangesByPath,
				discardedPaths: discardedAgentPaths,
			}),
		[agentBaseFiles, agentChangesByPath, discardedAgentPaths],
	);
	const [resolvedAgentDraft, setResolvedAgentDraft] =
		useState<ResolvedAgentDraft | null>(null);
	useEffect(() => {
		if (!agentChangeSet || !agentReviewSelections) return;

		let active = true;
		void materializeSelectedAgentDraftFiles({
			baseFiles: agentBaseFiles,
			changeSet: agentChangeSet,
			reviewSelections: agentReviewSelections,
		}).then((selectedFiles) => {
			if (!active) return;
			setResolvedAgentDraft({
				changeSet: agentChangeSet,
				files: selectedFiles,
				reviewSelections: agentReviewSelections,
			});
		});
		return () => {
			active = false;
		};
	}, [agentBaseFiles, agentChangeSet, agentReviewSelections]);
	const resolvedSelectionMatches =
		resolvedAgentDraft?.changeSet === agentChangeSet &&
		resolvedAgentDraft.reviewSelections === agentReviewSelections;
	const agentDraftContents = resolvedSelectionMatches
		? resolvedAgentDraft.files
		: projectedAgentDraftContents;
	const agentDraftFiles = useMemo(
		() =>
			agentDraftContents
				? Object.fromEntries(
						Object.entries(agentDraftContents).map(([path, content]) => [
							path,
							{ code: content },
						]),
					)
				: null,
		[agentDraftContents],
	);
	const [previewChoice, setPreviewChoice] = useState<{
		mode: PreviewMode;
		runId: string | null;
	}>({ mode: "current", runId: null });
	const hasDraft = agentDraftFiles !== null;
	const previewMode: PreviewMode =
		hasDraft &&
		(previewChoice.runId !== agentRunId || previewChoice.mode === "draft")
			? "draft"
			: "current";
	const files =
		previewMode === "draft" && agentDraftFiles
			? agentDraftFiles
			: workspaceFiles;
	const consoleSourceKey =
		previewMode === "draft" ? `draft:${agentRunId}` : "current";
	const previousConsoleSourceKeyRef = useRef(consoleSourceKey);
	useEffect(() => {
		useConsoleStore
			.getState()
			.setSourceLabel(previewMode === "draft" ? "Agent Draft" : "Current");
	}, [previewMode]);
	useEffect(() => {
		if (previousConsoleSourceKeyRef.current === consoleSourceKey) return;
		previousConsoleSourceKeyRef.current = consoleSourceKey;
		useConsoleStore.getState().clearLogs();
	}, [consoleSourceKey]);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [runtimes, setRuntimes] = useState<PreviewRuntime[]>(() => [
		{ files, id: 0 },
	]);
	const [activeRuntimeId, setActiveRuntimeId] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const activeRuntimeIdRef = useRef(0);
	const nextRuntimeIdRef = useRef(0);
	const pendingRuntimeIdRef = useRef<number | null>(null);
	const pendingFilesRef = useRef<PreviewFiles | null>(null);
	const latestFilesRef = useRef(files);
	useEffect(() => {
		latestFilesRef.current = files;
	}, [files]);

	const stageRuntime = useCallback((nextFiles: PreviewFiles) => {
		if (pendingFilesRef.current === nextFiles) return;

		const nextRuntime = {
			files: nextFiles,
			id: ++nextRuntimeIdRef.current,
		};
		pendingFilesRef.current = nextFiles;
		pendingRuntimeIdRef.current = nextRuntime.id;
		setRuntimes((current) => {
			const activeRuntime = current.find(
				(runtime) => runtime.id === activeRuntimeIdRef.current,
			);
			return activeRuntime ? [activeRuntime, nextRuntime] : [nextRuntime];
		});
	}, []);

	const activateRuntime = useCallback(
		(runtimeId: number) => {
			if (pendingRuntimeIdRef.current !== runtimeId) return;

			if (pendingFilesRef.current !== latestFilesRef.current) {
				stageRuntime(latestFilesRef.current);
				return;
			}

			activeRuntimeIdRef.current = runtimeId;
			pendingRuntimeIdRef.current = null;
			pendingFilesRef.current = null;
			setActiveRuntimeId(runtimeId);
			setRuntimes((current) =>
				current.filter((runtime) => runtime.id === runtimeId),
			);
			setIsRefreshing(false);
		},
		[stageRuntime],
	);

	const refreshPreview = useCallback(() => {
		setIsRefreshing(true);
		stageRuntime(files);
		window.setTimeout(() => setIsRefreshing(false), 500);
	}, [files, stageRuntime]);

	const toggleFullscreen = useCallback(() => {
		if (!containerRef.current) return;

		if (!document.fullscreenElement) {
			containerRef.current.requestFullscreen();
			setIsFullscreen(true);
		} else {
			document.exitFullscreen();
			setIsFullscreen(false);
		}
	}, []);
	// Listen for fullscreen changes (e.g., user presses Escape)
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
		};
	}, []);

	const filePaths = useMemo(() => Object.keys(files).sort().join(","), [files]);
	const previousFilePathsRef = useRef(filePaths);
	useEffect(() => {
		if (previousFilePathsRef.current === filePaths) return;
		previousFilePathsRef.current = filePaths;
		if (filePaths) stageRuntime(files);
	}, [filePaths, files, stageRuntime]);

	// Show loading state if no files
	if (Object.keys(files).length === 0) {
		return (
			<div className="h-full w-full flex flex-col bg-bg-primary text-fg-primary">
				<div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-secondary border-b border-border-primary">
					Preview
				</div>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<Loader2 className="h-8 w-8 mx-auto mb-3 text-accent/60 animate-spin" />
						<p className="text-sm text-fg-muted">Loading project...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="h-full w-full flex flex-col bg-bg-primary text-fg-primary"
		>
			<PreviewToolbar
				hasDraft={hasDraft}
				isFullscreen={isFullscreen}
				isRefreshing={isRefreshing}
				onPreviewModeChange={(mode) =>
					setPreviewChoice({ mode, runId: agentRunId })
				}
				onRefresh={refreshPreview}
				onToggleFullscreen={toggleFullscreen}
				previewMode={previewMode}
			/>
			<div className="relative flex-1 overflow-hidden">
				{runtimes.map((runtime) => {
					const isActive = runtime.id === activeRuntimeId;
					const shouldBridgeConsole = runtimes.length === 1 || !isActive;
					return (
						<div
							key={runtime.id}
							aria-hidden={!isActive}
							data-active={isActive}
							data-testid="preview-runtime"
							className={`absolute inset-0 ${
								isActive ? "z-10" : "pointer-events-none z-0"
							}`}
						>
							<SandpackProvider
								files={isActive ? files : runtime.files}
								template="react"
								theme={resolvedTheme}
								style={{ height: "100%" }}
								options={{
									autorun: true,
									autoReload: true,
									bundlerTimeOut: 15_000,
									classes: { "sp-loading": "hidden" },
									initMode: "immediate",
									activeFile: "/src/App.js",
									visibleFiles: ["/src/App.js", "/src/index.js"],
								}}
								customSetup={{ entry: "/src/index.js" }}
								className="h-full overflow-hidden"
							>
								{isActive ? (
									<SandpackClientFileSync
										onStalledFiles={stageRuntime}
										sourceFiles={files}
									/>
								) : (
									<SandpackReadyListener
										onReady={() => activateRuntime(runtime.id)}
									/>
								)}
								{shouldBridgeConsole && <SandpackConsoleBridgeListener />}
								<SandpackPreview
									showOpenInCodeSandbox={false}
									showRefreshButton={false}
									style={{ height: "100%" }}
								/>
							</SandpackProvider>
						</div>
					);
				})}
			</div>
		</div>
	);
}
