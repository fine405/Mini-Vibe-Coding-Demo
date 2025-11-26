import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface LayoutState {
	showChat: boolean;
	showConsole: boolean;
}

interface LayoutActions {
	toggleChat: () => void;
	toggleConsole: () => void;
	setChatVisible: (visible: boolean) => void;
	setConsoleVisible: (visible: boolean) => void;
}

type LayoutStore = LayoutState & LayoutActions;

export const useLayoutStore = create<LayoutStore>()(
	devtools(
		immer((set) => ({
			showChat: true,
			showConsole: true,

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
		})),
	),
);
