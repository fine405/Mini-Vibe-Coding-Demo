import { describe, expect, it } from "vitest";
import { resolveProviderSelection } from "@/modules/agent-chat/provider-selection";
import type { PublicProvider } from "@/modules/providers/types";

const providers: PublicProvider[] = [
	{
		id: "openai",
		name: "OpenAI",
		description: "OpenAI models",
		configured: false,
		missingEnvVars: ["OPENAI_API_KEY"],
		defaultModelId: "openai/gpt-5.4",
		models: [
			{ id: "openai/gpt-5.4", label: "GPT-5.4", description: "Default" },
		],
	},
	{
		id: "deepseek",
		name: "DeepSeek",
		description: "DeepSeek models",
		configured: true,
		missingEnvVars: [],
		defaultModelId: "deepseek/deepseek-chat",
		models: [
			{
				id: "deepseek/deepseek-chat",
				label: "DeepSeek Chat",
				description: "Default",
			},
			{
				id: "deepseek/deepseek-reasoner",
				label: "DeepSeek Reasoner",
				description: "Reasoning",
			},
		],
	},
];

describe("resolveProviderSelection", () => {
	it("keeps a configured, allowlisted saved selection", () => {
		expect(
			resolveProviderSelection(providers, {
				providerId: "deepseek",
				modelId: "deepseek/deepseek-reasoner",
			}),
		).toEqual({
			providerId: "deepseek",
			modelId: "deepseek/deepseek-reasoner",
		});
	});

	it("falls back to the first configured provider when a saved provider is unavailable", () => {
		expect(
			resolveProviderSelection(providers, {
				providerId: "openai",
				modelId: "openai/gpt-5.4",
			}),
		).toEqual({
			providerId: "deepseek",
			modelId: "deepseek/deepseek-chat",
		});
	});

	it("keeps the first provider visible as a disabled selection when no key is configured", () => {
		const unavailable = providers.map((provider) => ({
			...provider,
			configured: false,
			missingEnvVars: [`${provider.id.toUpperCase()}_API_KEY`],
		}));

		expect(resolveProviderSelection(unavailable)).toEqual({
			providerId: "openai",
			modelId: "openai/gpt-5.4",
		});
	});

	it("returns null for an empty catalog", () => {
		expect(resolveProviderSelection([])).toBeNull();
	});
});
