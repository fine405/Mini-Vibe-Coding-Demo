import "@tanstack/react-start/server-only";
import type { MastraModelConfig } from "@mastra/core/llm";
import type {
	ModelSelection,
	PublicModel,
	PublicProvider,
} from "@/modules/providers/types";

interface ProviderDefinition {
	id: string;
	name: string;
	description: string;
	envVars: string[];
	defaultModelEnvVar: string;
	defaultModelId: string;
	models: PublicModel[];
}

export interface ProviderConfigSource {
	get(name: string): string | undefined;
}

export interface ResolvedProviderModel extends ModelSelection {
	mastraModel: MastraModelConfig;
}

export class EnvironmentProviderConfigSource implements ProviderConfigSource {
	get(name: string): string | undefined {
		return process.env[name];
	}
}

export class ObjectProviderConfigSource implements ProviderConfigSource {
	constructor(private readonly values: Record<string, string | undefined>) {}

	get(name: string): string | undefined {
		return this.values[name];
	}
}

export type ProviderCatalogErrorCode =
	| "PROVIDER_NOT_FOUND"
	| "PROVIDER_NOT_CONFIGURED"
	| "MODEL_NOT_ALLOWED";

export class ProviderCatalogError extends Error {
	constructor(
		readonly code: ProviderCatalogErrorCode,
		message: string,
	) {
		super(message);
		this.name = "ProviderCatalogError";
	}
}

const PROVIDERS: ProviderDefinition[] = [
	{
		id: "openai",
		name: "OpenAI",
		description: "GPT and Codex models",
		envVars: ["OPENAI_API_KEY"],
		defaultModelEnvVar: "OPENAI_DEFAULT_MODEL",
		defaultModelId: "openai/gpt-5.4",
		models: [
			{
				id: "openai/gpt-5.4",
				label: "GPT-5.4",
				description: "Default high-capability coding model",
			},
			{
				id: "openai/gpt-5.3-codex",
				label: "GPT-5.3 Codex",
				description: "Coding-specialized model",
			},
			{
				id: "openai/gpt-5-mini",
				label: "GPT-5 mini",
				description: "Faster, cost-effective option",
			},
		],
	},
	{
		id: "qwen",
		name: "Qwen",
		description: "Alibaba Cloud DashScope (China)",
		envVars: ["DASHSCOPE_API_KEY"],
		defaultModelEnvVar: "QWEN_DEFAULT_MODEL",
		defaultModelId: "alibaba-cn/qwen3-coder-plus",
		models: [
			{
				id: "alibaba-cn/qwen3-coder-plus",
				label: "Qwen3 Coder Plus",
				description: "Large-context coding model",
			},
			{
				id: "alibaba-cn/qwen3-coder-flash",
				label: "Qwen3 Coder Flash",
				description: "Fast coding model",
			},
			{
				id: "alibaba-cn/qwen3.5-plus",
				label: "Qwen3.5 Plus",
				description: "General-purpose reasoning model",
			},
		],
	},
	{
		id: "deepseek",
		name: "DeepSeek",
		description: "DeepSeek chat and reasoning models",
		envVars: ["DEEPSEEK_API_KEY"],
		defaultModelEnvVar: "DEEPSEEK_DEFAULT_MODEL",
		defaultModelId: "deepseek/deepseek-chat",
		models: [
			{
				id: "deepseek/deepseek-chat",
				label: "DeepSeek Chat",
				description: "Default tool-capable chat model",
			},
			{
				id: "deepseek/deepseek-reasoner",
				label: "DeepSeek Reasoner",
				description: "Reasoning-focused model",
			},
			{
				id: "deepseek/deepseek-v4-pro",
				label: "DeepSeek V4 Pro",
				description: "High-capability model",
			},
		],
	},
	{
		id: "anthropic",
		name: "Anthropic",
		description: "Claude models",
		envVars: ["ANTHROPIC_API_KEY"],
		defaultModelEnvVar: "ANTHROPIC_DEFAULT_MODEL",
		defaultModelId: "anthropic/claude-sonnet-4-6",
		models: [
			{
				id: "anthropic/claude-sonnet-4-6",
				label: "Claude Sonnet 4.6",
				description: "Balanced coding model",
			},
			{
				id: "anthropic/claude-sonnet-5",
				label: "Claude Sonnet 5",
				description: "Latest Sonnet family",
			},
			{
				id: "anthropic/claude-opus-4-7",
				label: "Claude Opus 4.7",
				description: "High-capability reasoning model",
			},
		],
	},
	{
		id: "google",
		name: "Google Gemini",
		description: "Gemini models",
		envVars: [
			"GOOGLE_API_KEY",
			"GOOGLE_GENERATIVE_AI_API_KEY",
			"GEMINI_API_KEY",
		],
		defaultModelEnvVar: "GOOGLE_DEFAULT_MODEL",
		defaultModelId: "google/gemini-2.5-pro",
		models: [
			{
				id: "google/gemini-2.5-pro",
				label: "Gemini 2.5 Pro",
				description: "Stable long-context model",
			},
			{
				id: "google/gemini-3.1-pro-preview-customtools",
				label: "Gemini 3.1 Pro Custom Tools",
				description: "Preview model optimized for custom tools",
			},
			{
				id: "google/gemini-2.5-flash",
				label: "Gemini 2.5 Flash",
				description: "Fast long-context model",
			},
		],
	},
	{
		id: "moonshot",
		name: "Moonshot / Kimi",
		description: "Kimi coding models",
		envVars: ["MOONSHOT_API_KEY"],
		defaultModelEnvVar: "MOONSHOT_DEFAULT_MODEL",
		defaultModelId: "moonshotai/kimi-k2.7-code",
		models: [
			{
				id: "moonshotai/kimi-k2.7-code",
				label: "Kimi K2.7 Code",
				description: "Coding-specialized model",
			},
			{
				id: "moonshotai/kimi-k2.7-code-highspeed",
				label: "Kimi K2.7 Code Highspeed",
				description: "Lower-latency coding model",
			},
			{
				id: "moonshotai/kimi-k2.6",
				label: "Kimi K2.6",
				description: "General-purpose Kimi model",
			},
		],
	},
	{
		id: "xai",
		name: "xAI",
		description: "Grok models",
		envVars: ["XAI_API_KEY"],
		defaultModelEnvVar: "XAI_DEFAULT_MODEL",
		defaultModelId: "xai/grok-build-0.1",
		models: [
			{
				id: "xai/grok-build-0.1",
				label: "Grok Build",
				description: "Coding-oriented Grok model",
			},
			{
				id: "xai/grok-4.3",
				label: "Grok 4.3",
				description: "General high-capability model",
			},
			{
				id: "xai/grok-4.20-0309-reasoning",
				label: "Grok 4.20 Reasoning",
				description: "Reasoning model",
			},
		],
	},
	{
		id: "openrouter",
		name: "OpenRouter",
		description: "Multi-provider model gateway",
		envVars: ["OPENROUTER_API_KEY"],
		defaultModelEnvVar: "OPENROUTER_DEFAULT_MODEL",
		defaultModelId: "openrouter/anthropic/claude-sonnet-4.6",
		models: [
			{
				id: "openrouter/anthropic/claude-sonnet-4.6",
				label: "Claude Sonnet 4.6",
				description: "Claude through OpenRouter",
			},
			{
				id: "openrouter/deepseek/deepseek-chat",
				label: "DeepSeek Chat",
				description: "DeepSeek through OpenRouter",
			},
			{
				id: "openrouter/openai/gpt-5.4",
				label: "GPT-5.4",
				description: "OpenAI through OpenRouter",
			},
		],
	},
];

export class ProviderCatalog {
	constructor(private readonly config: ProviderConfigSource) {}

	private defaultModelId(provider: ProviderDefinition): string {
		const configuredDefault = this.config
			.get(provider.defaultModelEnvVar)
			?.trim();
		return configuredDefault &&
			provider.models.some((model) => model.id === configuredDefault)
			? configuredDefault
			: provider.defaultModelId;
	}

	private configuredKey(provider: ProviderDefinition): string | undefined {
		for (const name of provider.envVars) {
			const value = this.config.get(name)?.trim();
			if (value) return value;
		}
		return undefined;
	}

	listPublic(): PublicProvider[] {
		return PROVIDERS.map((provider) => {
			const configured = Boolean(this.configuredKey(provider));
			return {
				id: provider.id,
				name: provider.name,
				description: provider.description,
				configured,
				missingEnvVars: configured ? [] : [...provider.envVars],
				defaultModelId: this.defaultModelId(provider),
				models: provider.models.map((model) => ({ ...model })),
			};
		});
	}

	resolve(selection: ModelSelection): ResolvedProviderModel {
		const provider = PROVIDERS.find(
			(candidate) => candidate.id === selection.providerId,
		);
		if (!provider) {
			throw new ProviderCatalogError(
				"PROVIDER_NOT_FOUND",
				`Unknown provider: ${selection.providerId}`,
			);
		}
		const apiKey = this.configuredKey(provider);
		if (!apiKey) {
			throw new ProviderCatalogError(
				"PROVIDER_NOT_CONFIGURED",
				`${provider.name} is not configured`,
			);
		}
		const model = provider.models.find(
			(candidate) => candidate.id === selection.modelId,
		);
		if (!model) {
			throw new ProviderCatalogError(
				"MODEL_NOT_ALLOWED",
				`Model is not allowlisted for ${provider.name}: ${selection.modelId}`,
			);
		}
		return {
			providerId: provider.id,
			modelId: model.id,
			mastraModel: { id: model.id, apiKey },
		};
	}
}
