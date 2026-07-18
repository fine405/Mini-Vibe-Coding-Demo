export interface PublicModel {
	id: `${string}/${string}`;
	label: string;
	description: string;
}

export interface PublicProvider {
	id: string;
	name: string;
	description: string;
	configured: boolean;
	missingEnvVars: string[];
	defaultModelId: string;
	models: PublicModel[];
}

export interface ModelSelection {
	providerId: string;
	modelId: string;
}

export interface HostedChatStatus {
	enabled: boolean;
	tavilyConfigured: boolean;
}

export interface ProvidersResponse {
	providers: PublicProvider[];
	hostedChat: HostedChatStatus;
}
