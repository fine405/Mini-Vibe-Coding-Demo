import { create } from "zustand";

interface AgentChatSessionState {
	sessionId: string;
	resetSession(): void;
}

function createSessionId(): string {
	const id =
		globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
	return `agent-chat:${id}`;
}

export const useAgentChatSessionStore = create<AgentChatSessionState>(
	(set) => ({
		sessionId: createSessionId(),
		resetSession: () => set({ sessionId: createSessionId() }),
	}),
);
