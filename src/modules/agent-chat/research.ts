import { isToolOrDynamicToolUIPart, type UIMessage } from "ai";
import { z } from "zod";

const httpUrlSchema = z
	.string()
	.max(2_048)
	.url()
	.refine((value) => {
		const protocol = new URL(value).protocol;
		return protocol === "http:" || protocol === "https:";
	}, "Source URL must use HTTP(S)");

export const webSourceSchema = z
	.object({
		title: z.string().trim().min(1).max(200),
		url: httpUrlSchema,
		icon: httpUrlSchema.optional(),
		snippet: z.string().trim().min(1).max(600).optional(),
	})
	.strict();

export type WebSource = z.infer<typeof webSourceSchema>;

export const webSearchInputSchema = z
	.object({
		query: z.string().trim().min(1).max(400),
		maxResults: z.number().int().min(1).max(5).default(5),
		topic: z.enum(["general", "news"]).default("general"),
		timeRange: z.enum(["day", "week", "month", "year"]).optional(),
	})
	.strict();

export type WebSearchInput = z.infer<typeof webSearchInputSchema>;

export const webSearchOutputSchema = z
	.object({
		query: z.string().max(400),
		sources: z.array(webSourceSchema).max(5),
	})
	.strict();

export type WebSearchOutput = z.infer<typeof webSearchOutputSchema>;

export const weatherSearchInputSchema = z
	.object({
		location: z.string().trim().min(1).max(120),
		forecastDays: z.number().int().min(1).max(7).default(5),
		units: z.enum(["metric", "imperial"]).default("metric"),
	})
	.strict();

export type WeatherSearchInput = z.infer<typeof weatherSearchInputSchema>;

const weatherPeriodSchema = z
	.object({
		date: z.string().min(1).max(40),
		condition: z.string().min(1).max(80),
		temperatureMax: z.number(),
		temperatureMin: z.number(),
		precipitationProbability: z.number().min(0).max(100).nullable(),
	})
	.strict();

export const weatherSearchOutputSchema = z
	.object({
		location: z
			.object({
				name: z.string().min(1).max(200),
				latitude: z.number(),
				longitude: z.number(),
				timezone: z.string().min(1).max(100),
			})
			.strict(),
		units: z
			.object({
				temperature: z.string().min(1).max(20),
				windSpeed: z.string().min(1).max(20),
				precipitation: z.string().min(1).max(20),
			})
			.strict(),
		current: z
			.object({
				time: z.string().min(1).max(40),
				temperature: z.number(),
				apparentTemperature: z.number(),
				condition: z.string().min(1).max(80),
				windSpeed: z.number(),
				precipitation: z.number(),
			})
			.strict(),
		forecast: z.array(weatherPeriodSchema).min(1).max(7),
		sources: z.array(webSourceSchema).length(1),
	})
	.strict();

export type WeatherSearchOutput = z.infer<typeof weatherSearchOutputSchema>;

const MAX_AGGREGATED_SOURCES = 10;

function parseToolOutput(output: unknown): unknown {
	if (typeof output !== "string") return output;
	try {
		return JSON.parse(output) as unknown;
	} catch {
		return null;
	}
}

export type ResearchToolResult =
	| { kind: "web"; data: WebSearchOutput }
	| { kind: "weather"; data: WeatherSearchOutput };

export function parseResearchToolOutput(
	toolName: string,
	output: unknown,
): ResearchToolResult | null {
	const candidate = parseToolOutput(output);
	if (toolName === "web_search") {
		const parsed = webSearchOutputSchema.safeParse(candidate);
		return parsed.success ? { kind: "web", data: parsed.data } : null;
	}
	if (toolName === "weather_search") {
		const parsed = weatherSearchOutputSchema.safeParse(candidate);
		return parsed.success ? { kind: "weather", data: parsed.data } : null;
	}
	return null;
}

function sourceKey(source: WebSource): string {
	const url = new URL(source.url);
	url.hash = "";
	return url.href;
}

export function collectResearchSources(parts: UIMessage["parts"]): WebSource[] {
	const sources: WebSource[] = [];
	const seen = new Set<string>();

	for (const part of parts) {
		if (
			!isToolOrDynamicToolUIPart(part) ||
			part.state !== "output-available" ||
			(part as { preliminary?: boolean }).preliminary
		) {
			continue;
		}

		const name =
			part.type === "dynamic-tool"
				? part.toolName
				: part.type.split("-").slice(1).join("-");
		const result = parseResearchToolOutput(name, part.output);
		if (!result) continue;
		for (const source of result.data.sources) {
			const key = sourceKey(source);
			if (seen.has(key)) continue;
			seen.add(key);
			sources.push(source);
			if (sources.length === MAX_AGGREGATED_SOURCES) return sources;
		}
	}

	return sources;
}
