import { describe, expect, it } from "vitest";
import {
	readHostedChatStatus,
	readHostedTavilyApiKey,
} from "@/server/chat-runtime-config";

describe("readHostedChatStatus", () => {
	it.each([
		[undefined, true],
		["true", true],
		["  TrUe  ", true],
	])("maps CHAT_ENABLED=%s to enabled=%s", (value, enabled) => {
		expect(
			readHostedChatStatus({
				CHAT_ENABLED: value,
			}),
		).toMatchObject({ enabled });
	});

	it.each(["false", " FALSE ", "", "   ", "yes", "1"])(
		"fails closed for CHAT_ENABLED=%j",
		(value) => {
			expect(readHostedChatStatus({ CHAT_ENABLED: value }).enabled).toBe(false);
		},
	);

	it("reports only whether a non-blank Tavily key is configured", () => {
		expect(
			readHostedChatStatus({ TAVILY_API_KEY: "  hosted-secret  " }),
		).toEqual({
			enabled: true,
			tavilyConfigured: true,
		});
		expect(readHostedChatStatus({ TAVILY_API_KEY: "   " })).toEqual({
			enabled: true,
			tavilyConfigured: false,
		});
	});

	it("normalizes the Tavily key used by the hosted gateway", () => {
		expect(
			readHostedTavilyApiKey({ TAVILY_API_KEY: "  hosted-tavily-value  " }),
		).toBe("hosted-tavily-value");
		expect(readHostedTavilyApiKey({ TAVILY_API_KEY: "   " })).toBeUndefined();
	});
});
