import { useSandpack } from "@codesandbox/sandpack-react";
import { useEffect, useRef } from "react";

export const CONSOLE_BRIDGE_EVENT = "mini-lovable.console" as const;

let logIdCounter = 0;

export interface ConsoleBridgePayload {
	id: string;
	method: string;
	data: unknown[];
	timestamp: number;
}

export interface ConsoleBridgeMessage {
	type: typeof CONSOLE_BRIDGE_EVENT;
	payload: ConsoleBridgePayload;
}

type ConsoleLogEntry = Record<string, unknown>;

const createPayload = (log: ConsoleLogEntry): ConsoleBridgePayload => {
	const method = typeof log.method === "string" ? log.method : "log";
	const data = Array.isArray(log.data)
		? (log.data as unknown[])
		: log.data
			? [log.data]
			: [];

	return {
		id:
			typeof log.id === "string"
				? log.id
				: `${method}-${Date.now()}-${logIdCounter++}`,
		method,
		data,
		timestamp: typeof log.timestamp === "number" ? log.timestamp : Date.now(),
	};
};

interface ConsoleMessage {
	type: string;
	log?: ConsoleLogEntry | ConsoleLogEntry[];
}

const normalizeLogs = (
	log?: ConsoleLogEntry | ConsoleLogEntry[],
): ConsoleLogEntry[] => {
	if (!log) {
		return [];
	}

	return Array.isArray(log) ? log : [log];
};

export function useSandpackConsoleBridge() {
	const { listen } = useSandpack();
	const stopRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		if (typeof window === "undefined" || !listen) {
			return;
		}

		const stopListening = listen((message) => {
			const consoleMessage = message as ConsoleMessage;
			if (consoleMessage?.type !== "console" || typeof window === "undefined") {
				return;
			}

			normalizeLogs(consoleMessage.log).forEach((logEntry) => {
				const payload = createPayload(logEntry);
				const bridgeMessage: ConsoleBridgeMessage = {
					type: CONSOLE_BRIDGE_EVENT,
					payload,
				};

				window.postMessage(bridgeMessage, "*");
			});
		});

		stopRef.current = stopListening;

		return () => {
			stopRef.current?.();
			stopRef.current = null;
		};
	}, [listen]);
}
