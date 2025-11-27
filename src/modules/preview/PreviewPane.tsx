import {
	SandpackPreview,
	SandpackProvider,
	useSandpack,
} from "@codesandbox/sandpack-react";
import { RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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

function RefreshButton() {
	const { sandpack } = useSandpack();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(() => {
		setIsRefreshing(true);
		// Force a refresh by updating the client
		sandpack.runSandpack();
		setTimeout(() => setIsRefreshing(false), 500);
	}, [sandpack]);

	return (
		<button
			type="button"
			onClick={handleRefresh}
			className="p-1 rounded hover:bg-bg-tertiary text-fg-secondary hover:text-fg-primary transition-colors"
			title="Refresh Preview"
		>
			<RefreshCw
				className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
			/>
		</button>
	);
}

export function PreviewPane() {
	const { filesByPath } = useFs();
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

	// Generate a stable key based on file paths to force Sandpack remount when files change significantly
	// This ensures preview updates after loading from persistence
	const sandpackKey = useMemo(() => {
		const paths = Object.keys(filesByPath).sort().join(",");
		return `sandpack-${paths.length}-${paths.slice(0, 100)}`;
	}, [filesByPath]);

	// Skip rendering if no files
	if (Object.keys(files).length === 0) {
		return (
			<div className="h-full w-full flex items-center justify-center bg-bg-primary text-fg-secondary">
				Loading files...
			</div>
		);
	}

	return (
		<div className="h-full w-full flex flex-col bg-bg-primary text-fg-primary">
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
				}}
				className="flex-1 flex flex-col overflow-hidden"
			>
				<SandpackConsoleBridgeListener />
				<div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-secondary border-b border-border-primary flex items-center justify-between">
					<span>Preview</span>
					<RefreshButton />
				</div>
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
