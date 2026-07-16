import "@tanstack/react-start/server-only";
import { createTool } from "@mastra/core/tools";
import {
	weatherSearchInputSchema,
	weatherSearchOutputSchema,
	webSearchInputSchema,
	webSearchOutputSchema,
} from "@/modules/agent-chat/research";
import type { ResearchGateway } from "@/server/agent/research-gateway";

function getResearchGateway(context: {
	requestContext?: { get(key: string): unknown };
}): ResearchGateway {
	const gateway = context.requestContext?.get("researchGateway");
	if (
		!gateway ||
		typeof gateway !== "object" ||
		!("searchWeb" in gateway) ||
		!("searchWeather" in gateway)
	) {
		throw new Error("Research gateway is missing from request context");
	}
	return gateway as ResearchGateway;
}

export const webSearchTool = createTool({
	id: "web_search",
	description:
		"Search the live public web for current or external facts. Return bounded results with original sources. Never send secrets, full workspace files, or proprietary code in the query.",
	strict: true,
	inputSchema: webSearchInputSchema,
	outputSchema: webSearchOutputSchema,
	mcp: {
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
	},
	execute: async (input, context) =>
		getResearchGateway(context).searchWeb(input, context.abortSignal),
});

export const weatherSearchTool = createTool({
	id: "weather_search",
	description:
		"Get current weather and a one-to-seven day forecast for one named location from Open-Meteo, including required source attribution.",
	strict: true,
	inputSchema: weatherSearchInputSchema,
	outputSchema: weatherSearchOutputSchema,
	mcp: {
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
	},
	execute: async (input, context) =>
		getResearchGateway(context).searchWeather(input, context.abortSignal),
});

export const researchTools = {
	web_search: webSearchTool,
	weather_search: weatherSearchTool,
};
