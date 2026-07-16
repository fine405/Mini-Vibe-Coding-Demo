import "@tanstack/react-start/server-only";
import { z } from "zod";
import {
	type WeatherSearchInput,
	type WeatherSearchOutput,
	type WebSearchInput,
	type WebSearchOutput,
	weatherSearchInputSchema,
	weatherSearchOutputSchema,
	webSearchInputSchema,
	webSearchOutputSchema,
	webSourceSchema,
} from "@/modules/agent-chat/research";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const OPEN_METEO_GEOCODING_URL =
	"https://geocoding-api.open-meteo.com/v1/search";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const MAX_UPSTREAM_RESPONSE_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 10_000;

const tavilyResponseSchema = z.object({
	query: z.string(),
	results: z.array(
		z.object({
			title: z.string(),
			url: z.string(),
			content: z.string().optional(),
			favicon: z.string().nullable().optional(),
		}),
	),
});

const openMeteoGeocodingSchema = z.object({
	results: z
		.array(
			z.object({
				name: z.string(),
				country: z.string().optional(),
				latitude: z.number(),
				longitude: z.number(),
				timezone: z.string(),
			}),
		)
		.optional(),
});

const openMeteoForecastSchema = z.object({
	timezone: z.string(),
	current: z.object({
		time: z.string(),
		temperature_2m: z.number(),
		apparent_temperature: z.number(),
		weather_code: z.number().int(),
		wind_speed_10m: z.number(),
		precipitation: z.number(),
	}),
	current_units: z.object({
		temperature_2m: z.string(),
		apparent_temperature: z.string(),
		wind_speed_10m: z.string(),
		precipitation: z.string(),
	}),
	daily: z.object({
		time: z.array(z.string()).min(1).max(7),
		weather_code: z.array(z.number().int()).min(1).max(7),
		temperature_2m_max: z.array(z.number()).min(1).max(7),
		temperature_2m_min: z.array(z.number()).min(1).max(7),
		precipitation_probability_max: z.array(z.number().nullable()).min(1).max(7),
	}),
});

export interface ResearchGateway {
	searchWeb(
		input: WebSearchInput,
		abortSignal?: AbortSignal,
	): Promise<WebSearchOutput>;
	searchWeather(
		input: WeatherSearchInput,
		abortSignal?: AbortSignal,
	): Promise<WeatherSearchOutput>;
}

export interface HttpResearchGatewayOptions {
	fetch?: typeof fetch;
	tavilyApiKey?: string;
}

async function readBoundedJson(
	response: Response,
	label: string,
): Promise<unknown> {
	const declaredLength = Number(response.headers.get("content-length"));
	if (
		Number.isFinite(declaredLength) &&
		declaredLength > MAX_UPSTREAM_RESPONSE_BYTES
	) {
		await response.body?.cancel().catch(() => undefined);
		throw new Error(`${label} response exceeded the size limit`);
	}

	const reader = response.body?.getReader();
	const decoder = new TextDecoder();
	let bytes = 0;
	let text = "";
	if (reader) {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) break;
			bytes += chunk.value.byteLength;
			if (bytes > MAX_UPSTREAM_RESPONSE_BYTES) {
				await reader.cancel().catch(() => undefined);
				throw new Error(`${label} response exceeded the size limit`);
			}
			text += decoder.decode(chunk.value, { stream: true });
		}
		text += decoder.decode();
	}
	try {
		return JSON.parse(text) as unknown;
	} catch {
		throw new Error(`${label} returned an invalid response.`);
	}
}

async function withUpstreamTimeout<T>(
	label: string,
	abortSignal: AbortSignal | undefined,
	operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
	const timeoutController = new AbortController();
	const timeoutId = setTimeout(
		() => timeoutController.abort(),
		UPSTREAM_TIMEOUT_MS,
	);
	const signal = abortSignal
		? AbortSignal.any([abortSignal, timeoutController.signal])
		: timeoutController.signal;
	try {
		return await operation(signal);
	} catch (error) {
		if (timeoutController.signal.aborted && !abortSignal?.aborted) {
			throw new Error(`${label} timed out. Try again.`);
		}
		if (abortSignal?.aborted) {
			throw new DOMException(`${label} was cancelled.`, "AbortError");
		}
		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
}

async function fetchUpstream(
	fetcher: typeof fetch,
	input: Parameters<typeof fetch>[0],
	init: RequestInit,
	failureMessage: string,
): Promise<Response> {
	try {
		return await fetcher(input, init);
	} catch (error) {
		if (init.signal?.aborted) throw error;
		throw new Error(failureMessage);
	}
}

function weatherCondition(code: number): string {
	if (code === 0) return "Clear sky";
	if (code === 1) return "Mainly clear";
	if (code === 2) return "Partly cloudy";
	if (code === 3) return "Overcast";
	if (code === 45 || code === 48) return "Fog";
	if (code >= 51 && code <= 57) return "Drizzle";
	if (code >= 61 && code <= 67) return "Rain";
	if (code >= 71 && code <= 77) return "Snow";
	if (code >= 80 && code <= 82) return "Rain showers";
	if (code === 85 || code === 86) return "Snow showers";
	if (code >= 95 && code <= 99) return "Thunderstorm";
	return "Unknown conditions";
}

export class HttpResearchGateway implements ResearchGateway {
	readonly #fetch: typeof fetch;
	readonly #tavilyApiKey: string | undefined;

	constructor(options: HttpResearchGatewayOptions = {}) {
		this.#fetch = options.fetch ?? globalThis.fetch;
		this.#tavilyApiKey = options.tavilyApiKey;
	}

	async searchWeb(
		input: WebSearchInput,
		abortSignal?: AbortSignal,
	): Promise<WebSearchOutput> {
		const parsedInput = webSearchInputSchema.parse(input);
		if (!this.#tavilyApiKey) {
			throw new Error(
				"Web search is unavailable because TAVILY_API_KEY is not configured",
			);
		}
		return withUpstreamTimeout("Web search", abortSignal, async (signal) => {
			const response = await fetchUpstream(
				this.#fetch,
				TAVILY_SEARCH_URL,
				{
					method: "POST",
					headers: {
						accept: "application/json",
						authorization: `Bearer ${this.#tavilyApiKey}`,
						"content-type": "application/json",
					},
					body: JSON.stringify({
						query: parsedInput.query,
						search_depth: "basic",
						max_results: parsedInput.maxResults,
						topic: parsedInput.topic,
						time_range: parsedInput.timeRange,
						include_answer: false,
						include_raw_content: false,
						include_images: false,
						include_favicon: true,
						safe_search: true,
					}),
					signal,
				},
				"Web search service is unavailable. Try again later.",
			);
			if (!response.ok) {
				if (response.status === 400) {
					throw new Error(
						"Web search rejected the query. Try a different query.",
					);
				}
				if (response.status === 401) {
					throw new Error(
						"Web search authentication failed. Check TAVILY_API_KEY.",
					);
				}
				if (response.status === 429) {
					throw new Error("Web search rate limit reached. Try again later.");
				}
				if (response.status === 432) {
					throw new Error(
						"Web search usage limit reached. Check the Tavily plan or quota.",
					);
				}
				if (response.status === 433) {
					throw new Error(
						"Web search billing limit reached. Check the Tavily account.",
					);
				}
				if (response.status >= 500) {
					throw new Error(
						"Web search service is unavailable. Try again later.",
					);
				}
				throw new Error("Web search request failed. Try again.");
			}
			const parsedUpstream = tavilyResponseSchema.safeParse(
				await readBoundedJson(response, "Web search"),
			);
			if (!parsedUpstream.success) {
				throw new Error("Web search returned an invalid response.");
			}
			const upstream = parsedUpstream.data;
			const sources = upstream.results
				.map((result) =>
					webSourceSchema.safeParse({
						title: result.title,
						url: result.url,
						snippet: result.content,
						icon: result.favicon ?? undefined,
					}),
				)
				.filter((result) => result.success)
				.map((result) => result.data)
				.slice(0, parsedInput.maxResults);

			return webSearchOutputSchema.parse({
				query: parsedInput.query,
				sources,
			});
		});
	}

	async searchWeather(
		input: WeatherSearchInput,
		abortSignal?: AbortSignal,
	): Promise<WeatherSearchOutput> {
		const parsedInput = weatherSearchInputSchema.parse(input);
		return withUpstreamTimeout(
			"Weather search",
			abortSignal,
			async (signal) => {
				const geocodingUrl = new URL(OPEN_METEO_GEOCODING_URL);
				geocodingUrl.searchParams.set("name", parsedInput.location);
				geocodingUrl.searchParams.set("count", "1");
				geocodingUrl.searchParams.set("language", "en");
				geocodingUrl.searchParams.set("format", "json");
				const geocodingResponse = await fetchUpstream(
					this.#fetch,
					geocodingUrl,
					{ signal },
					"Weather service is unavailable. Try again later.",
				);
				if (!geocodingResponse.ok) {
					if (geocodingResponse.status === 429) {
						throw new Error(
							"Weather service rate limit reached. Try again later.",
						);
					}
					if (geocodingResponse.status >= 500) {
						throw new Error("Weather service is unavailable. Try again later.");
					}
					throw new Error(
						"Weather location lookup failed. Try a more specific location.",
					);
				}
				const parsedGeocoding = openMeteoGeocodingSchema.safeParse(
					await readBoundedJson(geocodingResponse, "Weather search"),
				);
				if (!parsedGeocoding.success) {
					throw new Error("Weather search returned an invalid response.");
				}
				const geocoding = parsedGeocoding.data;
				const place = geocoding.results?.[0];
				if (!place) {
					throw new Error(
						`No weather location found for "${parsedInput.location}"`,
					);
				}

				const forecastUrl = new URL(OPEN_METEO_FORECAST_URL);
				forecastUrl.searchParams.set("latitude", String(place.latitude));
				forecastUrl.searchParams.set("longitude", String(place.longitude));
				forecastUrl.searchParams.set(
					"current",
					"temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation",
				);
				forecastUrl.searchParams.set(
					"daily",
					"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
				);
				forecastUrl.searchParams.set("timezone", "auto");
				forecastUrl.searchParams.set(
					"forecast_days",
					String(parsedInput.forecastDays),
				);
				forecastUrl.searchParams.set(
					"temperature_unit",
					parsedInput.units === "imperial" ? "fahrenheit" : "celsius",
				);
				forecastUrl.searchParams.set(
					"wind_speed_unit",
					parsedInput.units === "imperial" ? "mph" : "kmh",
				);
				forecastUrl.searchParams.set(
					"precipitation_unit",
					parsedInput.units === "imperial" ? "inch" : "mm",
				);
				const forecastResponse = await fetchUpstream(
					this.#fetch,
					forecastUrl,
					{ signal },
					"Weather service is unavailable. Try again later.",
				);
				if (!forecastResponse.ok) {
					if (forecastResponse.status === 429) {
						throw new Error(
							"Weather service rate limit reached. Try again later.",
						);
					}
					if (forecastResponse.status >= 500) {
						throw new Error("Weather service is unavailable. Try again later.");
					}
					throw new Error("Weather forecast request failed. Try again.");
				}
				const parsedForecast = openMeteoForecastSchema.safeParse(
					await readBoundedJson(forecastResponse, "Weather search"),
				);
				if (!parsedForecast.success) {
					throw new Error("Weather search returned an invalid response.");
				}
				const forecast = parsedForecast.data;
				const periods = forecast.daily.time.map((date, index) => ({
					date,
					condition: weatherCondition(forecast.daily.weather_code[index] ?? -1),
					temperatureMax: forecast.daily.temperature_2m_max[index],
					temperatureMin: forecast.daily.temperature_2m_min[index],
					precipitationProbability:
						forecast.daily.precipitation_probability_max[index] ?? null,
				}));

				const output = weatherSearchOutputSchema.safeParse({
					location: {
						name: [place.name, place.country].filter(Boolean).join(", "),
						latitude: place.latitude,
						longitude: place.longitude,
						timezone: forecast.timezone,
					},
					units: {
						temperature: forecast.current_units.temperature_2m,
						windSpeed: forecast.current_units.wind_speed_10m,
						precipitation: forecast.current_units.precipitation,
					},
					current: {
						time: forecast.current.time,
						temperature: forecast.current.temperature_2m,
						apparentTemperature: forecast.current.apparent_temperature,
						condition: weatherCondition(forecast.current.weather_code),
						windSpeed: forecast.current.wind_speed_10m,
						precipitation: forecast.current.precipitation,
					},
					forecast: periods,
					sources: [
						{
							title: "Weather data by Open-Meteo.com",
							url: "https://open-meteo.com/",
							snippet: "Current weather and forecast data under CC BY 4.0.",
						},
					],
				});
				if (!output.success) {
					throw new Error("Weather search returned an invalid response.");
				}
				return output.data;
			},
		);
	}
}
