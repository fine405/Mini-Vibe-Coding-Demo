import { describe, expect, it, vi } from "vitest";
import type { ResearchGateway } from "@/server/agent/research-gateway";
import { weatherSearchTool } from "@/server/agent/research-tools";

describe("weatherSearchTool", () => {
	it("logs a safe timeout category with the request ID", async () => {
		const gateway: ResearchGateway = {
			searchWeb: vi.fn(),
			searchWeather: vi.fn(async () => {
				throw new Error("Weather search timed out. Try again.");
			}),
		};
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const execute = weatherSearchTool.execute;
		if (!execute) throw new Error("Weather tool is not executable");

		await expect(
			execute({ location: "深圳", forecastDays: 1, units: "metric" }, {
				requestContext: {
					get: (key: string) =>
						key === "researchGateway" ? gateway : "request-weather-timeout",
				},
			} as Parameters<typeof execute>[1]),
		).rejects.toThrow("Weather search timed out. Try again.");
		expect(warn).toHaveBeenCalledWith(
			JSON.stringify({
				event: "agent.tool.failed",
				requestId: "request-weather-timeout",
				toolName: "weather_search",
				errorCategory: "WEATHER_TIMEOUT",
			}),
		);
		warn.mockRestore();
	});
});
