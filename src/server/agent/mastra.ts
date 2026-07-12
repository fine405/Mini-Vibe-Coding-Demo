import "@tanstack/react-start/server-only";
import { Mastra } from "@mastra/core/mastra";
import { codingAgent } from "@/server/agent/coding-agent";

export const mastra = new Mastra({
	agents: { codingAgent },
	logger: false,
});
