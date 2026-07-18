import { z } from "zod";
import type { PublicProvider } from "@/modules/providers/types";

const MAX_EPHEMERAL_API_KEY_LENGTH = 512;

const optionalApiKeySchema = z.preprocess((value) => {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	return trimmed || undefined;
}, z.string().max(MAX_EPHEMERAL_API_KEY_LENGTH).optional());

export const ephemeralCredentialsSchema = z
	.object({
		deepseekApiKey: optionalApiKeySchema,
		tavilyApiKey: optionalApiKeySchema,
	})
	.strict();

export type EphemeralCredentials = z.infer<typeof ephemeralCredentialsSchema>;

export interface EphemeralCredentialStatus {
	deepseekConfigured: boolean;
	tavilyConfigured: boolean;
}

export interface EphemeralCredentialHolder {
	read(): EphemeralCredentials;
	status(): EphemeralCredentialStatus;
	update(credentials: EphemeralCredentials): EphemeralCredentialStatus;
	clear(): EphemeralCredentialStatus;
}

export function createEphemeralCredentialHolder(): EphemeralCredentialHolder {
	let current: EphemeralCredentials = {};

	const status = (): EphemeralCredentialStatus => ({
		deepseekConfigured: Boolean(current.deepseekApiKey),
		tavilyConfigured: Boolean(current.tavilyApiKey),
	});

	return {
		read: () => ({ ...current }),
		status,
		update(credentials) {
			const parsed = ephemeralCredentialsSchema.parse(credentials);
			current = {
				deepseekApiKey: parsed.deepseekApiKey ?? current.deepseekApiKey,
				tavilyApiKey: parsed.tavilyApiKey ?? current.tavilyApiKey,
			};
			return status();
		},
		clear() {
			current = {};
			return status();
		},
	};
}

export function applyEphemeralProviderStatus(
	providers: PublicProvider[],
	status: EphemeralCredentialStatus,
): PublicProvider[] {
	if (!status.deepseekConfigured) return providers;
	return providers.map((provider) =>
		provider.id === "deepseek" && !provider.configured
			? { ...provider, configured: true, missingEnvVars: [] }
			: provider,
	);
}
