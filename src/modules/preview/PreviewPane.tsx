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
import { ConsolePanel } from "./ConsolePanel";

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
			className="p-1 rounded hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition-colors"
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

	// Skip rendering if no files
	if (Object.keys(files).length === 0) {
		return (
			<div className="h-full w-full flex items-center justify-center bg-neutral-950 text-neutral-400">
				Loading files...
			</div>
		);
	}

	return (
		<div className="h-full w-full flex flex-col bg-neutral-950 text-neutral-100">
			<SandpackProvider
				key="sandpack-provider"
				files={files}
				template="react"
				theme="dark"
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
				<div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 border-b border-neutral-800/60 flex items-center justify-between">
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
							<PanelResizeHandle className="h-px bg-neutral-800/60 hover:bg-blue-500 transition-colors cursor-row-resize" />
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
