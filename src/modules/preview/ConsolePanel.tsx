import { useSandpackConsole } from "@codesandbox/sandpack-react";
import {
	AlertCircle,
	AlertTriangle,
	ChevronDown,
	ChevronUp,
	Info,
	Trash2,
} from "lucide-react";
import { useState } from "react";

interface ConsolePanelProps {
	maxHeight?: number;
}

export function ConsolePanel({ maxHeight = 200 }: ConsolePanelProps) {
	const { logs, reset } = useSandpackConsole({ resetOnPreviewRestart: true });
	const [isCollapsed, setIsCollapsed] = useState(false);

	const getLogIcon = (type: string) => {
		switch (type) {
			case "error":
				return <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />;
			case "warn":
				return <AlertTriangle className="h-3 w-3 text-yellow-400 shrink-0" />;
			case "info":
				return <Info className="h-3 w-3 text-blue-400 shrink-0" />;
			default:
				return <Info className="h-3 w-3 text-neutral-500 shrink-0" />;
		}
	};

	const getLogStyle = (type: string) => {
		switch (type) {
			case "error":
				return "text-red-400 bg-red-500/10";
			case "warn":
				return "text-yellow-400 bg-yellow-500/10";
			case "info":
				return "text-blue-400";
			default:
				return "text-neutral-300";
		}
	};

	const formatLogData = (data: unknown[]): string => {
		return data
			.map((item) => {
				if (typeof item === "object") {
					try {
						return JSON.stringify(item, null, 2);
					} catch {
						return String(item);
					}
				}
				return String(item);
			})
			.join(" ");
	};

	return (
		<div className="border-t border-neutral-800/60 bg-neutral-900/80">
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800/40">
				<button
					type="button"
					onClick={() => setIsCollapsed(!isCollapsed)}
					className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 hover:text-neutral-200 transition-colors"
				>
					{isCollapsed ? (
						<ChevronUp className="h-3 w-3" />
					) : (
						<ChevronDown className="h-3 w-3" />
					)}
					<span>Console</span>
					{logs.length > 0 && (
						<span className="px-1.5 py-0.5 text-[10px] font-medium bg-neutral-700 rounded">
							{logs.length}
						</span>
					)}
				</button>
				<button
					type="button"
					onClick={reset}
					className="p-1 rounded hover:bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 transition-colors"
					title="Clear Console"
				>
					<Trash2 className="h-3 w-3" />
				</button>
			</div>

			{/* Console output */}
			{!isCollapsed && (
				<div
					className="overflow-auto font-mono text-xs"
					style={{ maxHeight: `${maxHeight}px` }}
				>
					{logs.length === 0 ? (
						<div className="px-3 py-4 text-center text-neutral-500 text-xs">
							No console output
						</div>
					) : (
						<div className="divide-y divide-neutral-800/30">
							{logs.map((log, index) => (
								<div
									key={`${log.id}-${index}`}
									className={`flex items-start gap-2 px-3 py-1.5 ${getLogStyle(log.method)}`}
								>
									{getLogIcon(log.method)}
									<pre className="flex-1 whitespace-pre-wrap break-all">
										{formatLogData(log.data ?? [])}
									</pre>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
