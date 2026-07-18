import type { HostedChatStatus } from "@/modules/providers/types";

export function readHostedTavilyApiKey(
	environment: Record<string, string | undefined>,
): string | undefined {
	return environment.TAVILY_API_KEY?.trim() || undefined;
}

export function readHostedChatStatus(
	environment: Record<string, string | undefined>,
): HostedChatStatus {
	const configuredValue = environment.CHAT_ENABLED;

	return {
		enabled:
			configuredValue === undefined ||
			configuredValue.trim().toLowerCase() === "true",
		tavilyConfigured: Boolean(readHostedTavilyApiKey(environment)),
	};
}
