import { describe, expect, it, vi } from "vitest";
import { HttpResearchGateway } from "@/server/agent/research-gateway";

describe("HttpResearchGateway", () => {
	it("rejects web search before network access when Tavily is not configured", async () => {
		const fetchMock = vi.fn<typeof fetch>();
		const gateway = new HttpResearchGateway({ fetch: fetchMock });

		await expect(
			gateway.searchWeb({ query: "latest news", maxResults: 5, topic: "news" }),
		).rejects.toThrow("TAVILY_API_KEY is not configured");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns bounded Tavily sources through the research interface", async () => {
		const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
			const headers = new Headers(init?.headers);
			expect(headers.get("authorization")).toBe("Bearer test-tavily-key");
			const requestBody = JSON.parse(String(init?.body));
			expect(requestBody).toMatchObject({
				query: "latest React release",
				search_depth: "basic",
				max_results: 5,
				include_answer: false,
				include_raw_content: false,
				include_images: false,
				include_favicon: true,
			});
			expect(requestBody).not.toHaveProperty("safe_search");
			return Response.json({
				query: "latest React release",
				results: [
					{
						title: "React releases",
						url: "https://react.dev/versions",
						content: "Current React release information.",
						score: 0.98,
						favicon: "https://react.dev/favicon.ico",
					},
				],
			});
		});
		const gateway = new HttpResearchGateway({
			fetch: fetchMock,
			tavilyApiKey: "test-tavily-key",
		});

		await expect(
			gateway.searchWeb({
				query: "latest React release",
				maxResults: 5,
				topic: "general",
			}),
		).resolves.toEqual({
			query: "latest React release",
			sources: [
				{
					title: "React releases",
					url: "https://react.dev/versions",
					snippet: "Current React release information.",
					icon: "https://react.dev/favicon.ico",
				},
			],
		});
		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.tavily.com/search",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("maps Tavily rate limits to a sanitized error without retrying", async () => {
		const fetchMock = vi.fn<typeof fetch>(
			async () => new Response("upstream account details", { status: 429 }),
		);
		const gateway = new HttpResearchGateway({
			fetch: fetchMock,
			tavilyApiKey: "test-tavily-key",
		});

		await expect(
			gateway.searchWeb({
				query: "current news",
				maxResults: 5,
				topic: "news",
			}),
		).rejects.toThrow("Web search rate limit reached. Try again later.");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each([
		[401, "Web search authentication failed. Check TAVILY_API_KEY."],
		[
			403,
			"Web search permission denied. Check the Tavily key permissions or plan.",
		],
		[432, "Web search usage limit reached. Check the Tavily plan or quota."],
		[433, "Web search billing limit reached. Check the Tavily account."],
		[500, "Web search service is unavailable. Try again later."],
	])(
		"maps Tavily status %i to an actionable error",
		async (status, message) => {
			const fetchMock = vi.fn<typeof fetch>(
				async () => new Response("sensitive upstream details", { status }),
			);
			const gateway = new HttpResearchGateway({
				fetch: fetchMock,
				tavilyApiKey: "test-tavily-key",
			});

			await expect(
				gateway.searchWeb({
					query: "current news",
					maxResults: 5,
					topic: "news",
				}),
			).rejects.toThrow(message);
			expect(fetchMock).toHaveBeenCalledTimes(1);
		},
	);

	it("sanitizes Tavily network failures", async () => {
		const gateway = new HttpResearchGateway({
			fetch: vi.fn<typeof fetch>(async () => {
				throw new Error("private network diagnostics");
			}),
			tavilyApiKey: "test-tavily-key",
		});

		await expect(
			gateway.searchWeb({
				query: "current news",
				maxResults: 5,
				topic: "news",
			}),
		).rejects.toThrow("Web search service is unavailable. Try again later.");
	});

	it("rejects an oversized Tavily response before exposing it to the Agent", async () => {
		const fetchMock = vi.fn<typeof fetch>(async () =>
			Response.json({
				query: "large response",
				results: [
					{
						title: "Oversized",
						url: "https://example.com/large",
						content: "x".repeat(300_000),
					},
				],
			}),
		);
		const gateway = new HttpResearchGateway({
			fetch: fetchMock,
			tavilyApiKey: "test-tavily-key",
		});

		await expect(
			gateway.searchWeb({
				query: "large response",
				maxResults: 1,
				topic: "general",
			}),
		).rejects.toThrow("Web search response exceeded the size limit");
	});

	it("times out a stalled Tavily request", async () => {
		vi.useFakeTimers();
		const fetchMock = vi.fn<typeof fetch>(
			async (_input, init) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener(
						"abort",
						() => reject(init.signal?.reason),
						{ once: true },
					);
				}),
		);
		const gateway = new HttpResearchGateway({
			fetch: fetchMock,
			tavilyApiKey: "test-tavily-key",
		});
		const pending = gateway.searchWeb({
			query: "stalled search",
			maxResults: 5,
			topic: "general",
		});
		const rejection = expect(pending).rejects.toThrow(
			"Web search timed out. Try again.",
		);

		await vi.advanceTimersByTimeAsync(10_001);
		await rejection;
		vi.useRealTimers();
	});

	it("propagates caller cancellation to an in-flight Tavily request", async () => {
		const fetchMock = vi.fn<typeof fetch>(
			async (_input, init) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener(
						"abort",
						() => reject(init.signal?.reason),
						{ once: true },
					);
				}),
		);
		const gateway = new HttpResearchGateway({
			fetch: fetchMock,
			tavilyApiKey: "test-tavily-key",
		});
		const controller = new AbortController();
		const pending = gateway.searchWeb(
			{ query: "cancelled search", maxResults: 5, topic: "general" },
			controller.signal,
		);

		controller.abort(new DOMException("Cancelled", "AbortError"));

		await expect(pending).rejects.toMatchObject({
			name: "AbortError",
			message: "Web search was cancelled.",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("maps malformed Tavily data to a stable error", async () => {
		const fetchMock = vi.fn<typeof fetch>(async () =>
			Response.json({ query: "broken", results: "not-an-array" }),
		);
		const gateway = new HttpResearchGateway({
			fetch: fetchMock,
			tavilyApiKey: "test-tavily-key",
		});

		await expect(
			gateway.searchWeb({ query: "broken", maxResults: 5, topic: "general" }),
		).rejects.toThrow("Web search returned an invalid response.");
	});

	it("resolves a Chinese location and returns attributed current weather and forecast", async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const url = new URL(String(input));
			if (url.hostname === "geocoding-api.open-meteo.com") {
				expect(url.searchParams.get("name")).toBe("深圳");
				expect(url.searchParams.get("language")).toBe("zh");
				return Response.json({
					results: [
						{
							name: "深圳",
							country: "China",
							latitude: 22.5455,
							longitude: 114.0683,
							timezone: "Asia/Shanghai",
						},
					],
				});
			}

			expect(url.hostname).toBe("api.open-meteo.com");
			expect(url.searchParams.get("forecast_days")).toBe("3");
			expect(url.searchParams.get("temperature_unit")).toBe("celsius");
			return Response.json({
				timezone: "Asia/Shanghai",
				current: {
					time: "2026-07-16T10:00",
					temperature_2m: 31.5,
					apparent_temperature: 36.2,
					weather_code: 2,
					wind_speed_10m: 12.4,
					precipitation: 0,
				},
				current_units: {
					temperature_2m: "°C",
					apparent_temperature: "°C",
					wind_speed_10m: "km/h",
					precipitation: "mm",
				},
				daily: {
					time: ["2026-07-16"],
					weather_code: [2],
					temperature_2m_max: [34.1],
					temperature_2m_min: [27.4],
					precipitation_probability_max: [30],
				},
			});
		});
		const gateway = new HttpResearchGateway({ fetch: fetchMock });

		await expect(
			gateway.searchWeather({
				location: "深圳",
				forecastDays: 3,
				units: "metric",
			}),
		).resolves.toEqual({
			location: {
				name: "深圳, China",
				latitude: 22.5455,
				longitude: 114.0683,
				timezone: "Asia/Shanghai",
			},
			units: {
				temperature: "°C",
				windSpeed: "km/h",
				precipitation: "mm",
			},
			current: {
				time: "2026-07-16T10:00",
				temperature: 31.5,
				apparentTemperature: 36.2,
				condition: "Partly cloudy",
				windSpeed: 12.4,
				precipitation: 0,
			},
			forecast: [
				{
					date: "2026-07-16",
					condition: "Partly cloudy",
					temperatureMax: 34.1,
					temperatureMin: 27.4,
					precipitationProbability: 30,
				},
			],
			sources: [
				{
					title: "Weather data by Open-Meteo.com",
					url: "https://open-meteo.com/",
					snippet: "Current weather and forecast data under CC BY 4.0.",
				},
			],
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("recovers from one transient Open-Meteo outage", async () => {
		let geocodingAttempts = 0;
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const url = new URL(String(input));
			if (url.hostname === "geocoding-api.open-meteo.com") {
				geocodingAttempts += 1;
				if (geocodingAttempts === 1) {
					return new Response("temporary outage", { status: 503 });
				}
				return Response.json({
					results: [
						{
							name: "深圳",
							country: "中国",
							latitude: 22.5455,
							longitude: 114.0683,
							timezone: "Asia/Shanghai",
						},
					],
				});
			}

			return Response.json({
				timezone: "Asia/Shanghai",
				current: {
					time: "2026-07-16T10:00",
					temperature_2m: 31.5,
					apparent_temperature: 36.2,
					weather_code: 2,
					wind_speed_10m: 12.4,
					precipitation: 0,
				},
				current_units: {
					temperature_2m: "°C",
					apparent_temperature: "°C",
					wind_speed_10m: "km/h",
					precipitation: "mm",
				},
				daily: {
					time: ["2026-07-16"],
					weather_code: [2],
					temperature_2m_max: [34.1],
					temperature_2m_min: [27.4],
					precipitation_probability_max: [30],
				},
			});
		});
		const gateway = new HttpResearchGateway({ fetch: fetchMock });

		await expect(
			gateway.searchWeather({
				location: "深圳",
				forecastDays: 1,
				units: "metric",
			}),
		).resolves.toMatchObject({
			location: { name: "深圳, 中国" },
			current: { temperature: 31.5 },
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("retries one timed-out weather attempt", async () => {
		vi.useFakeTimers();
		let attempt = 0;
		const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
			attempt += 1;
			if (attempt === 1) {
				return new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener(
						"abort",
						() => reject(init.signal?.reason),
						{ once: true },
					);
				});
			}
			return Response.json({ results: [] });
		});
		const gateway = new HttpResearchGateway({ fetch: fetchMock });
		const pending = gateway.searchWeather({
			location: "深圳",
			forecastDays: 1,
			units: "metric",
		});
		const rejection = expect(pending).rejects.toThrow(
			'No weather location found for "深圳"',
		);

		await vi.advanceTimersByTimeAsync(10_001);
		await rejection;
		expect(fetchMock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});

	it("maps malformed Open-Meteo data to a stable error", async () => {
		const fetchMock = vi.fn<typeof fetch>(async () =>
			Response.json({ results: [{ name: "Missing coordinates" }] }),
		);
		const gateway = new HttpResearchGateway({ fetch: fetchMock });

		await expect(
			gateway.searchWeather({
				location: "Broken place",
				forecastDays: 5,
				units: "metric",
			}),
		).rejects.toThrow("Weather search returned an invalid response.");
	});

	it("maps Open-Meteo rate limits without retrying", async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const url = new URL(String(input));
			if (url.hostname === "geocoding-api.open-meteo.com") {
				return Response.json({
					results: [
						{
							name: "Shanghai",
							latitude: 31.2,
							longitude: 121.4,
							timezone: "Asia/Shanghai",
						},
					],
				});
			}
			return new Response("quota details", { status: 429 });
		});
		const gateway = new HttpResearchGateway({ fetch: fetchMock });

		await expect(
			gateway.searchWeather({
				location: "Shanghai",
				forecastDays: 5,
				units: "metric",
			}),
		).rejects.toThrow("Weather service rate limit reached. Try again later.");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("maps a persistent Open-Meteo outage after one retry", async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const url = new URL(String(input));
			if (url.hostname === "geocoding-api.open-meteo.com") {
				return Response.json({
					results: [
						{
							name: "Shanghai",
							latitude: 31.2,
							longitude: 121.4,
							timezone: "Asia/Shanghai",
						},
					],
				});
			}
			return new Response("private outage details", { status: 503 });
		});
		const gateway = new HttpResearchGateway({ fetch: fetchMock });

		await expect(
			gateway.searchWeather({
				location: "Shanghai",
				forecastDays: 5,
				units: "metric",
			}),
		).rejects.toThrow("Weather service is unavailable. Try again later.");
		expect(fetchMock).toHaveBeenCalledTimes(4);
	});

	it("returns an actionable error when Open-Meteo cannot resolve a location", async () => {
		const gateway = new HttpResearchGateway({
			fetch: vi.fn<typeof fetch>(async () => Response.json({ results: [] })),
		});

		await expect(
			gateway.searchWeather({
				location: "Not a real place",
				forecastDays: 5,
				units: "metric",
			}),
		).rejects.toThrow('No weather location found for "Not a real place"');
	});
});
