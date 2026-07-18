import { describe, expect, it } from "vitest";
import {
	createEphemeralCredentialHolder,
	ephemeralCredentialsSchema,
} from "@/modules/agent-chat/ephemeral-credentials";

describe("ephemeral demo credentials", () => {
	it("normalizes bounded values and rejects generic environment fields", () => {
		expect(
			ephemeralCredentialsSchema.parse({
				deepseekApiKey: "  page-deepseek  ",
				tavilyApiKey: "   ",
			}),
		).toEqual({
			deepseekApiKey: "page-deepseek",
			tavilyApiKey: undefined,
		});
		expect(
			ephemeralCredentialsSchema.safeParse({
				deepseekApiKey: "x".repeat(513),
			}),
		).toMatchObject({ success: false });
		expect(
			ephemeralCredentialsSchema.safeParse({ OPENAI_API_KEY: "not-allowed" }),
		).toMatchObject({ success: false });
	});

	it("keeps secrets in one page-memory holder until it is cleared", () => {
		const holder = createEphemeralCredentialHolder();

		expect(holder.status()).toEqual({
			deepseekConfigured: false,
			tavilyConfigured: false,
		});
		holder.update({ deepseekApiKey: "page-deepseek" });
		holder.update({ tavilyApiKey: "page-tavily" });

		expect(holder.status()).toEqual({
			deepseekConfigured: true,
			tavilyConfigured: true,
		});
		expect(holder.read()).toEqual({
			deepseekApiKey: "page-deepseek",
			tavilyApiKey: "page-tavily",
		});

		const copy = holder.read();
		copy.deepseekApiKey = "mutated-copy";
		expect(holder.read().deepseekApiKey).toBe("page-deepseek");

		holder.clear();
		expect(holder.read()).toEqual({});
		expect(holder.status()).toEqual({
			deepseekConfigured: false,
			tavilyConfigured: false,
		});
	});
});
