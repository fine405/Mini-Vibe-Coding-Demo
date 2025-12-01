import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { ConsoleBridgePayload } from "./consoleBridge";

interface ConsoleState {
	logs: ConsoleBridgePayload[];
}

interface ConsoleActions {
	addLog: (log: ConsoleBridgePayload) => void;
	clearLogs: () => void;
}

type ConsoleStore = ConsoleState & ConsoleActions;

export const useConsoleStore = create<ConsoleStore>()(
	devtools(
		immer((set) => ({
			logs: [],

			addLog: (log) =>
				set((state) => {
					state.logs.push(log);
				}),

			clearLogs: () =>
				set((state) => {
					state.logs = [];
				}),
		})),
		{ name: "console-store" },
	),
);
