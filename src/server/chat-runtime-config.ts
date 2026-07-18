import type { HostedChatStatus } from "@/modules/providers/types";

export function readHostedTavilyApiKey(
	environment: Record<string, string | undefined>,
): string | undefined {
	return environment.TAVILY_API_KEY?.trim() || undefined;
}

export function readHostedChatStatus(
	environment: Record<string, string | undefined>,
): HostedChatStatus {
	return {
		enabled: environment.CHAT_ENABLED === "true",
		tavilyConfigured: Boolean(readHostedTavilyApiKey(environment)),
	};
}
