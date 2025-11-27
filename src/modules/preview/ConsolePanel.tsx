import { useSandpackConsole } from "@codesandbox/sandpack-react";
import { AlertCircle, AlertTriangle, Info, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	CONSOLE_BRIDGE_EVENT,
	type ConsoleBridgePayload,
} from "./consoleBridge";

export function ConsolePanel() {
	const { reset: sandpackReset } = useSandpackConsole({
		resetOnPreviewRestart: true,
	});
	const [logs, setLogs] = useState<ConsoleBridgePayload[]>([]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const handleMessage = (event: MessageEvent) => {
			const data = event.data;
			if (data?.type !== CONSOLE_BRIDGE_EVENT || !data.payload) {
				return;
			}

			setLogs((prev) => [...prev, data.payload as ConsoleBridgePayload]);
		};

		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	const handleClear = () => {
		sandpackReset();
		setLogs([]);
	};

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
		<div
			className="h-full flex flex-col bg-neutral-900/80"
			style={{ cursor: "var(--cursor-default)" }}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800/40 shrink-0">
				<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
					<span>Console</span>
					{logs.length > 0 && (
						<span className="px-1.5 py-0.5 text-[10px] font-medium bg-neutral-700 rounded">
							{logs.length}
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={handleClear}
					className="p-1 rounded hover:bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 transition-colors"
					title="Clear Console"
				>
					<Trash2 className="h-3 w-3" />
				</button>
			</div>

			{/* Console output */}
			<div className="flex-1 overflow-auto font-mono text-xs">
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
		</div>
	);
}
