import {
	SandpackPreview,
	SandpackProvider,
	useSandpack,
} from "@codesandbox/sandpack-react";
import { Loader2, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useFs } from "@/modules/fs/store";
import { useLayoutStore } from "@/modules/layout/store";
import { useThemeStore } from "@/modules/theme/store";
import { ConsolePanel } from "./ConsolePanel";
import { useSandpackConsoleBridge } from "./consoleBridge";

function SandpackConsoleBridgeListener() {
	useSandpackConsoleBridge();
	return null;
}

function PreviewToolbar({
	isFullscreen,
	onToggleFullscreen,
}: {
	isFullscreen: boolean;
	onToggleFullscreen: () => void;
}) {
	const { sandpack } = useSandpack();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(() => {
		setIsRefreshing(true);
		sandpack.runSandpack();
		setTimeout(() => setIsRefreshing(false), 500);
	}, [sandpack]);

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
					onClick={handleRefresh}
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
	const { filesByPath } = useFs();
	const { showConsole } = useLayoutStore();
	const { resolvedTheme } = useThemeStore();
	const [isFullscreen, setIsFullscreen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

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

	// Generate a stable key based on file paths to force Sandpack remount when files change significantly
	// This ensures preview updates after loading from persistence
	const sandpackKey = useMemo(() => {
		const paths = Object.keys(filesByPath).sort().join(",");
		return `sandpack-${paths.length}-${paths.slice(0, 100)}`;
	}, [filesByPath]);

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
			<SandpackProvider
				key={sandpackKey}
				files={files}
				template="react"
				theme={resolvedTheme}
				style={{
					height: "100%",
				}}
				options={{
					autorun: true,
					autoReload: true,
					bundlerURL: "https://sandpack-bundler-4bw.pages.dev",
					activeFile: "/src/App.js",
					visibleFiles: ["/src/App.js", "/src/index.js"],
				}}
				customSetup={{
					entry: "/src/index.js",
				}}
				className="flex-1 flex flex-col overflow-hidden"
			>
				<SandpackConsoleBridgeListener />
				<PreviewToolbar
					isFullscreen={isFullscreen}
					onToggleFullscreen={toggleFullscreen}
				/>
				<PanelGroup direction="vertical" className="flex-1 overflow-hidden">
					<Panel defaultSize={showConsole ? 75 : 100} minSize={30}>
						<div className="h-full overflow-hidden">
							<SandpackPreview
								showOpenInCodeSandbox={false}
								showRefreshButton={false}
								style={{ height: "100%" }}
							/>
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
			</SandpackProvider>
		</div>
	);
}
