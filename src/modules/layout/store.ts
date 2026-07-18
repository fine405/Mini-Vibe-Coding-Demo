import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type WorkbenchView = "code" | "preview";

interface LayoutState {
	showChat: boolean;
	showConsole: boolean;
	activeView: WorkbenchView;
}

interface LayoutActions {
	toggleChat: () => void;
	toggleConsole: () => void;
	setChatVisible: (visible: boolean) => void;
	setConsoleVisible: (visible: boolean) => void;
	setActiveView: (view: WorkbenchView) => void;
}

type LayoutStore = LayoutState & LayoutActions;

export const useLayoutStore = create<LayoutStore>()(
	devtools(
		immer((set) => ({
			showChat: true,
			showConsole: false,
			activeView: "preview",

			toggleChat: () =>
				set((state) => {
					state.showChat = !state.showChat;
				}),

			toggleConsole: () =>
				set((state) => {
					state.showConsole = !state.showConsole;
				}),

			setChatVisible: (visible) =>
				set((state) => {
					state.showChat = visible;
				}),

			setConsoleVisible: (visible) =>
				set((state) => {
					state.showConsole = visible;
				}),

			setActiveView: (view) =>
				set((state) => {
					state.activeView = view;
				}),
		})),
	),
);
