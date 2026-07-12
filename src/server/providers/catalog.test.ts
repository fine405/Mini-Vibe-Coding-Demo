import { describe, expect, it } from "vitest";
import {
	ObjectProviderConfigSource,
	ProviderCatalog,
	type ProviderCatalogError,
} from "@/server/providers/catalog";

describe("ProviderCatalog", () => {
	it("lists every supported provider while only enabling configured entries", () => {
		const catalog = new ProviderCatalog(
			new ObjectProviderConfigSource({ OPENAI_API_KEY: "sk-private" }),
		);

		const providers = catalog.listPublic();

		expect(providers.map((provider) => provider.id)).toEqual([
			"openai",
			"qwen",
			"deepseek",
			"anthropic",
			"google",
			"moonshot",
			"xai",
			"openrouter",
		]);
		expect(
			providers.find((provider) => provider.id === "openai"),
		).toMatchObject({ configured: true, missingEnvVars: [] });
		expect(providers.find((provider) => provider.id === "qwen")).toMatchObject({
			configured: false,
			missingEnvVars: ["DASHSCOPE_API_KEY"],
		});
		expect(JSON.stringify(providers)).not.toContain("sk-private");
	});

	it("resolves only configured, allowlisted provider/model pairs", () => {
		const catalog = new ProviderCatalog(
			new ObjectProviderConfigSource({ DEEPSEEK_API_KEY: "secret" }),
		);

		expect(
			catalog.resolve({
				providerId: "deepseek",
				modelId: "deepseek/deepseek-chat",
			}),
		).toEqual({
			providerId: "deepseek",
			modelId: "deepseek/deepseek-chat",
			mastraModel: {
				id: "deepseek/deepseek-chat",
				apiKey: "secret",
			},
		});
		expect(() =>
			catalog.resolve({
				providerId: "deepseek",
				modelId: "https://attacker.invalid/model",
			}),
		).toThrowError(
			expect.objectContaining<Partial<ProviderCatalogError>>({
				code: "MODEL_NOT_ALLOWED",
			}),
		);
		expect(() =>
			catalog.resolve({ providerId: "openai", modelId: "openai/gpt-5.4" }),
		).toThrowError(
			expect.objectContaining<Partial<ProviderCatalogError>>({
				code: "PROVIDER_NOT_CONFIGURED",
			}),
		);
	});

	it("uses only allowlisted non-secret default model overrides", () => {
		const configured = new ProviderCatalog(
			new ObjectProviderConfigSource({
				DEEPSEEK_API_KEY: "secret",
				DEEPSEEK_DEFAULT_MODEL: "deepseek/deepseek-reasoner",
			}),
		);
		const invalid = new ProviderCatalog(
			new ObjectProviderConfigSource({
				DEEPSEEK_API_KEY: "secret",
				DEEPSEEK_DEFAULT_MODEL: "https://attacker.invalid/model",
			}),
		);

		expect(
			configured.listPublic().find((provider) => provider.id === "deepseek")
				?.defaultModelId,
		).toBe("deepseek/deepseek-reasoner");
		expect(
			invalid.listPublic().find((provider) => provider.id === "deepseek")
				?.defaultModelId,
		).toBe("deepseek/deepseek-chat");
	});

	it("reports multiple configured providers independently", () => {
		const catalog = new ProviderCatalog(
			new ObjectProviderConfigSource({
				OPENAI_API_KEY: "openai-secret",
				DEEPSEEK_API_KEY: "deepseek-secret",
			}),
		);

		expect(
			catalog
				.listPublic()
				.filter((provider) => provider.configured)
				.map((provider) => provider.id),
		).toEqual(["openai", "deepseek"]);
	});

	it("passes alternate Google credentials explicitly to the model router", () => {
		const catalog = new ProviderCatalog(
			new ObjectProviderConfigSource({ GEMINI_API_KEY: "gemini-test-key" }),
		);

		expect(
			catalog.resolve({
				providerId: "google",
				modelId: "google/gemini-2.5-pro",
			}),
		).toEqual({
			providerId: "google",
			modelId: "google/gemini-2.5-pro",
			mastraModel: {
				id: "google/gemini-2.5-pro",
				apiKey: "gemini-test-key",
			},
		});
	});
});
