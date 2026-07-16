import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { collectResearchSources } from "@/modules/agent-chat/research";

const weatherOutput = {
	location: {
		name: "Shanghai",
		latitude: 31.23,
		longitude: 121.47,
		timezone: "Asia/Shanghai",
	},
	units: {
		temperature: "°C",
		windSpeed: "km/h",
		precipitation: "mm",
	},
	current: {
		time: "2026-07-16T10:00",
		temperature: 30,
		apparentTemperature: 34,
		condition: "Partly cloudy",
		windSpeed: 12,
		precipitation: 0,
	},
	forecast: [
		{
			date: "2026-07-16",
			condition: "Partly cloudy",
			temperatureMax: 34,
			temperatureMin: 27,
			precipitationProbability: 20,
		},
	],
	sources: [
		{
			title: "Weather data by Open-Meteo.com",
			url: "https://open-meteo.com/",
		},
	],
};

describe("collectResearchSources", () => {
	it("collects validated web and weather sources in first-seen order", () => {
		const parts = [
			{
				type: "dynamic-tool",
				toolName: "web_search",
				toolCallId: "web-1",
				state: "output-available",
				input: { query: "AI Elements citations" },
				output: {
					query: "AI Elements citations",
					sources: [
						{
							title: "Sources component",
							url: "https://elements.ai-sdk.dev/components/sources#usage",
							snippet: "A source list for AI responses.",
						},
					],
				},
			},
			{
				type: "dynamic-tool",
				toolName: "weather_search",
				toolCallId: "weather-1",
				state: "output-available",
				input: { location: "Shanghai" },
				output: JSON.stringify(weatherOutput),
			},
		] as unknown as UIMessage["parts"];

		expect(collectResearchSources(parts)).toEqual([
			{
				title: "Sources component",
				url: "https://elements.ai-sdk.dev/components/sources#usage",
				snippet: "A source list for AI responses.",
			},
			weatherOutput.sources[0],
		]);
	});

	it("deduplicates equivalent URLs without rewriting the first source", () => {
		const parts = [
			{
				type: "dynamic-tool",
				toolName: "web_search",
				toolCallId: "web-1",
				state: "output-available",
				input: { query: "example" },
				output: {
					query: "example",
					sources: [
						{
							title: "First title",
							url: "https://EXAMPLE.com:443/article#details",
						},
						{
							title: "Duplicate title",
							url: "https://example.com/article#other",
						},
					],
				},
			},
		] as unknown as UIMessage["parts"];

		expect(collectResearchSources(parts)).toEqual([
			{
				title: "First title",
				url: "https://EXAMPLE.com:443/article#details",
			},
		]);
	});

	it("ignores unrelated, unfinished, and malformed output and caps the list", () => {
		const webParts = Array.from({ length: 3 }, (_, callIndex) => ({
			type: "dynamic-tool",
			toolName: "web_search",
			toolCallId: `web-${callIndex}`,
			state: "output-available",
			input: { query: `query ${callIndex}` },
			output: {
				query: `query ${callIndex}`,
				sources: Array.from({ length: 5 }, (_, sourceIndex) => ({
					title: `Source ${callIndex}-${sourceIndex}`,
					url: `https://example.com/${callIndex}/${sourceIndex}`,
				})),
			},
		}));
		const parts = [
			{
				type: "dynamic-tool",
				toolName: "read_file",
				toolCallId: "unrelated",
				state: "output-available",
				input: {},
				output: {
					sources: [{ title: "Injected", url: "https://bad.example" }],
				},
			},
			{
				type: "dynamic-tool",
				toolName: "web_search",
				toolCallId: "unfinished",
				state: "input-available",
				input: { query: "unfinished" },
			},
			{
				type: "dynamic-tool",
				toolName: "web_search",
				toolCallId: "malformed",
				state: "output-available",
				input: { query: "malformed" },
				output: {
					query: "malformed",
					sources: [{ title: "Bad protocol", url: "javascript:alert(1)" }],
				},
			},
			...webParts,
		] as unknown as UIMessage["parts"];

		const sources = collectResearchSources(parts);

		expect(sources).toHaveLength(10);
		expect(sources[0]?.title).toBe("Source 0-0");
		expect(sources[9]?.title).toBe("Source 1-4");
	});
});
