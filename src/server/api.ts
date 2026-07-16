import "@tanstack/react-start/server-only";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { ChatModelResolver } from "@/server/agent/chat";
import { createChatResponse } from "@/server/agent/chat";
import {
	HttpResearchGateway,
	type ResearchGateway,
} from "@/server/agent/research-gateway";
import {
	EnvironmentProviderConfigSource,
	ProviderCatalog,
} from "@/server/providers/catalog";

export interface ApiDependencies {
	providerCatalog?: ProviderCatalog;
	modelResolver?: ChatModelResolver;
	researchGateway?: ResearchGateway;
}

export function createApi(dependencies: ApiDependencies = {}) {
	const api = new Hono<{ Variables: { requestId: string } }>().basePath("/api");
	const providerCatalog =
		dependencies.providerCatalog ??
		new ProviderCatalog(new EnvironmentProviderConfigSource());
	const researchGateway =
		dependencies.researchGateway ??
		new HttpResearchGateway({ tavilyApiKey: process.env.TAVILY_API_KEY });

	api.use("*", async (context, next) => {
		const requestId =
			context.req.header("x-request-id")?.slice(0, 100) ?? crypto.randomUUID();
		context.set("requestId", requestId);
		const fetchSite = context.req.header("sec-fetch-site");
		const origin = context.req.header("origin");
		if (
			fetchSite === "cross-site" ||
			(origin && origin !== new URL(context.req.url).origin)
		) {
			return context.json(
				{
					error: {
						code: "CROSS_SITE_REQUEST",
						message: "Cross-site API requests are not allowed",
					},
				},
				403,
			);
		}
		await next();
		context.header("X-Content-Type-Options", "nosniff");
		context.header("X-Request-Id", requestId);
	});
	api.use(
		"/chat",
		bodyLimit({
			maxSize: 2 * 1024 * 1024,
			onError: (context) =>
				context.json(
					{
						error: {
							code: "REQUEST_TOO_LARGE",
							message: "Chat request exceeds 2 MiB",
						},
					},
					413,
				),
		}),
	);

	api.get("/health", (context) =>
		context.json({ ok: true, service: "mini-lovable-agent" }),
	);
	api.get("/providers", (context) =>
		context.json({ providers: providerCatalog.listPublic() }),
	);
	api.post("/chat", (context) =>
		createChatResponse(context.req.raw, context.get("requestId"), {
			providerCatalog,
			modelResolver: dependencies.modelResolver,
			researchGateway,
		}),
	);

	api.notFound((context) =>
		context.json(
			{
				error: {
					code: "API_ROUTE_NOT_FOUND",
					message: "API route not found",
				},
			},
			404,
		),
	);

	api.onError((_error, context) => {
		console.error(
			JSON.stringify({
				event: "api.request.failed",
				requestId: context.get("requestId"),
				errorCategory: "UNHANDLED_ERROR",
			}),
		);
		return context.json(
			{
				error: {
					code: "INTERNAL_SERVER_ERROR",
					message: "Internal server error",
				},
			},
			500,
		);
	});

	return api;
}

export type Api = ReturnType<typeof createApi>;
