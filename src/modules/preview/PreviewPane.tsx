import {
	SandpackPreview,
	SandpackProvider,
	useSandpack,
} from "@codesandbox/sandpack-react";
import { RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { useFs } from "@/modules/fs/store";
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

	const files = Object.fromEntries(
		Object.entries(filesByPath).map(([path, file]) => [
			path,
			{
				code: file.content,
			},
		]),
	);

	return (
		<div className="h-full w-full flex flex-col bg-neutral-950 text-neutral-100">
			<SandpackProvider
				files={files}
				template="react"
				theme="dark"
				options={{
					autorun: true,
					autoReload: true,
				}}
			>
				<div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 border-b border-neutral-800/60 flex items-center justify-between">
					<span>Preview</span>
					<RefreshButton />
				</div>
				<div className="flex-1 overflow-hidden flex flex-col">
					<div className="flex-1 overflow-hidden">
						<SandpackPreview
							showOpenInCodeSandbox={false}
							showRefreshButton={false}
							style={{ height: "100%" }}
						/>
					</div>
					<ConsolePanel />
				</div>
			</SandpackProvider>
		</div>
	);
}
