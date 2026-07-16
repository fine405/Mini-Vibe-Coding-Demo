import "@tanstack/react-start/server-only";
import { createTool } from "@mastra/core/tools";
import {
	weatherSearchInputSchema,
	weatherSearchOutputSchema,
	webSearchInputSchema,
	webSearchOutputSchema,
} from "@/modules/agent-chat/research";
import type { ResearchGateway } from "@/server/agent/research-gateway";

interface ResearchToolContext {
	requestContext?: { get(key: string): unknown };
}

function getResearchGateway(context: ResearchToolContext): ResearchGateway {
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

function weatherErrorCategory(error: unknown): string {
	if (!(error instanceof Error)) return "WEATHER_TOOL_ERROR";
	if (error.name === "AbortError") return "WEATHER_CANCELLED";
	if (error.message.startsWith("Weather search timed out")) {
		return "WEATHER_TIMEOUT";
	}
	if (error.message.startsWith("Weather service rate limit")) {
		return "WEATHER_RATE_LIMIT";
	}
	if (error.message.startsWith("Weather service is unavailable")) {
		return "WEATHER_UNAVAILABLE";
	}
	if (error.message.startsWith("No weather location found")) {
		return "WEATHER_LOCATION_NOT_FOUND";
	}
	if (error.message.startsWith("Weather search returned an invalid response")) {
		return "WEATHER_INVALID_RESPONSE";
	}
	return "WEATHER_TOOL_ERROR";
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
	execute: async (input, context) => {
		try {
			return await getResearchGateway(context).searchWeather(
				input,
				context.abortSignal,
			);
		} catch (error) {
			const requestId = context.requestContext?.get("requestId");
			console.warn(
				JSON.stringify({
					event: "agent.tool.failed",
					requestId: typeof requestId === "string" ? requestId : undefined,
					toolName: "weather_search",
					errorCategory: weatherErrorCategory(error),
				}),
			);
			throw error;
		}
	},
});

export const researchTools = {
	web_search: webSearchTool,
	weather_search: weatherSearchTool,
};
