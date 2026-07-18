import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { ConsoleBridgePayload } from "@/modules/preview/consoleBridge";

interface ConsoleState {
	logs: ConsoleBridgePayload[];
	sourceLabel: string;
}

interface ConsoleActions {
	addLog: (log: ConsoleBridgePayload) => void;
	clearLogs: () => void;
	setSourceLabel: (label: string) => void;
}

type ConsoleStore = ConsoleState & ConsoleActions;

export const useConsoleStore = create<ConsoleStore>()(
	devtools(
		immer((set) => ({
			logs: [],
			sourceLabel: "Current",

			addLog: (log) =>
				set((state) => {
					state.logs.push(log);
				}),

			clearLogs: () =>
				set((state) => {
					state.logs = [];
				}),

			setSourceLabel: (label) =>
				set((state) => {
					state.sourceLabel = label;
				}),
		})),
		{ name: "console-store" },
	),
);
