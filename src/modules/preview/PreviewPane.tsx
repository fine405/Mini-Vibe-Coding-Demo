import {
	SandpackPreview,
	SandpackProvider,
	useSandpack,
} from "@codesandbox/sandpack-react";
import { Loader2, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useLayoutStore } from "@/modules/layout/store";
import { ConsolePanel } from "@/modules/preview/ConsolePanel";
import { useSandpackConsoleBridge } from "@/modules/preview/consoleBridge";
import { useThemeStore } from "@/modules/theme/store";
import { useBrowserWorkspaceFiles } from "@/modules/workspace/browser";

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

function PreviewToolbar({
	isFullscreen,
	isRefreshing,
	onRefresh,
	onToggleFullscreen,
}: {
	isFullscreen: boolean;
	isRefreshing: boolean;
	onRefresh: () => void;
	onToggleFullscreen: () => void;
}) {
	return (
		<div className="px-3 py-2 text-xs border-b border-border-primary flex items-center gap-2">
			<span className="font-semibold uppercase tracking-wide text-fg-secondary">
				Preview
			</span>

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
	const { showConsole } = useLayoutStore();
	const { resolvedTheme } = useThemeStore();
	const files = useMemo(
		() =>
			Object.fromEntries(
				Object.entries(filesByPath).map(([path, file]) => [
					path,
					{ code: file.content },
				]),
			),
		[filesByPath],
	);
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
			id="tour-preview"
			ref={containerRef}
			className="h-full w-full flex flex-col bg-bg-primary text-fg-primary"
		>
			<PreviewToolbar
				isFullscreen={isFullscreen}
				isRefreshing={isRefreshing}
				onRefresh={refreshPreview}
				onToggleFullscreen={toggleFullscreen}
			/>
			<PanelGroup direction="vertical" className="flex-1 overflow-hidden">
				<Panel defaultSize={showConsole ? 75 : 100} minSize={30}>
					<div className="relative h-full overflow-hidden">
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
				</Panel>
				{showConsole && (
					<>
						<PanelResizeHandle className="h-px bg-border-primary hover:bg-accent transition-colors cursor-row-resize" />
						<Panel defaultSize={25} minSize={10}>
							<ConsolePanel />
						</Panel>
					</>
				)}
			</PanelGroup>
		</div>
	);
}
