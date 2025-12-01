import { useSandpackConsole } from "@codesandbox/sandpack-react";
import { AlertCircle, AlertTriangle, Info, Trash2 } from "lucide-react";
import { useEffect } from "react";
import {
	CONSOLE_BRIDGE_EVENT,
	type ConsoleBridgePayload,
} from "./consoleBridge";
import { useConsoleStore } from "./consoleStore";

export function ConsolePanel() {
	const { reset: sandpackReset } = useSandpackConsole({
		resetOnPreviewRestart: true,
	});
	const logs = useConsoleStore((state) => state.logs);
	const addLog = useConsoleStore((state) => state.addLog);
	const clearLogs = useConsoleStore((state) => state.clearLogs);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const handleMessage = (event: MessageEvent) => {
			const data = event.data;
			if (data?.type !== CONSOLE_BRIDGE_EVENT || !data.payload) {
				return;
			}

			addLog(data.payload as ConsoleBridgePayload);
		};

		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [addLog]);

	const handleClear = () => {
		sandpackReset();
		clearLogs();
	};

	const getLogIcon = (type: string) => {
		switch (type) {
			case "error":
				return <AlertCircle className="h-3 w-3 text-error shrink-0" />;
			case "warn":
				return <AlertTriangle className="h-3 w-3 text-warning shrink-0" />;
			case "info":
				return <Info className="h-3 w-3 text-accent shrink-0" />;
			default:
				return <Info className="h-3 w-3 text-fg-muted shrink-0" />;
		}
	};

	const getLogStyle = (type: string) => {
		switch (type) {
			case "error":
				return "text-error bg-error/10";
			case "warn":
				return "text-warning bg-warning/10";
			case "info":
				return "text-accent";
			default:
				return "text-fg-primary";
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
		<div
			className="h-full flex flex-col bg-bg-secondary animate-fade-in"
			style={{ cursor: "var(--cursor-default)" }}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-1.5 border-b border-border-secondary shrink-0">
				<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-secondary">
					<span>Console</span>
					{logs.length > 0 && (
						<span className="px-1.5 py-0.5 text-[10px] font-medium bg-bg-tertiary rounded">
							{logs.length}
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={handleClear}
					className="p-1 rounded hover:bg-bg-tertiary text-fg-muted hover:text-fg-primary transition-colors"
					title="Clear Console"
				>
					<Trash2 className="h-3 w-3" />
				</button>
			</div>

			{/* Console output */}
			<div className="flex-1 overflow-auto font-mono text-xs">
				{logs.length === 0 ? (
					<div className="px-3 py-4 text-center text-fg-muted text-xs">
						No console output
					</div>
				) : (
					<div className="divide-y divide-border-secondary">
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
		</div>
	);
}
