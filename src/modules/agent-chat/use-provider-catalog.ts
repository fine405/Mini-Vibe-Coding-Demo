import { useCallback, useEffect, useState } from "react";
import type {
	ProvidersResponse,
	PublicProvider,
} from "@/modules/providers/types";

interface ProviderCatalogState {
	providers: PublicProvider[];
	isLoading: boolean;
	error: string | null;
}

function isProvidersResponse(value: unknown): value is ProvidersResponse {
	return Boolean(
		value &&
			typeof value === "object" &&
			Array.isArray((value as ProvidersResponse).providers),
	);
}

export function useProviderCatalog() {
	const [reloadToken, setReloadToken] = useState(0);
	const [state, setState] = useState<ProviderCatalogState>({
		providers: [],
		isLoading: true,
		error: null,
	});

	useEffect(() => {
		const controller = new AbortController();
		async function load() {
			setState((current) => ({ ...current, isLoading: true, error: null }));
			try {
				const response = await fetch("/api/providers", {
					signal: controller.signal,
					headers: { accept: "application/json" },
				});
				if (!response.ok) {
					throw new Error(
						`Provider catalog request failed (${response.status})`,
					);
				}
				const body: unknown = await response.json();
				if (!isProvidersResponse(body)) {
					throw new Error("Provider catalog response was invalid");
				}
				setState({ providers: body.providers, isLoading: false, error: null });
			} catch (error) {
				if (controller.signal.aborted) return;
				setState({
					providers: [],
					isLoading: false,
					error:
						error instanceof Error
							? error.message
							: "Provider catalog could not be loaded",
				});
			}
		}
		void load();
		return () => controller.abort();
	}, [reloadToken]);

	const reload = useCallback(() => setReloadToken((value) => value + 1), []);
	return { ...state, reload };
}
