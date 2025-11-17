import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Patch } from "../patches/types";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	patch?: Patch; // If assistant message includes a patch
	timestamp: number;
}

interface ChatStore {
	messages: ChatMessage[];
	isLoading: boolean;
	addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
	setLoading: (loading: boolean) => void;
	clearMessages: () => void;
}

const stateCreator = immer<ChatStore>((set) => ({
	messages: [],
	isLoading: false,

	addMessage(message) {
		set((state) => {
			state.messages.push({
				...message,
				id: `msg-${Date.now()}-${Math.random()}`,
				timestamp: Date.now(),
			});
		});
	},

	setLoading(loading) {
		set({ isLoading: loading });
	},

	clearMessages() {
		set({ messages: [] });
	},
}));

export const useChatStore = create<ChatStore>()(
	devtools(stateCreator, { name: "ChatStore" }),
);
