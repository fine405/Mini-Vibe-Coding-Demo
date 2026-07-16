import { describe, expect, it, vi } from "vitest";
import { createWorkspaceSnapshot, hashText } from "@/modules/workspace/domain";
import { createApi } from "@/server/api";
import {
	ObjectProviderConfigSource,
	ProviderCatalog,
} from "@/server/providers/catalog";

describe("Hono API", () => {
	it("reports the runtime as healthy", async () => {
		const response = await createApi().request("/api/health");

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			ok: true,
			service: "mini-lovable-agent",
		});
	});

	it("returns typed errors for unknown API routes", async () => {
		const response = await createApi().request("/api/missing");

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			error: {
				code: "API_ROUTE_NOT_FOUND",
				message: "API route not found",
			},
		});
	});

	it("returns the public provider catalog without secrets", async () => {
		const api = createApi({
			providerCatalog: new ProviderCatalog(
				new ObjectProviderConfigSource({ OPENAI_API_KEY: "server-secret" }),
			),
		});

		const response = await api.request("/api/providers");
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.providers).toHaveLength(8);
		expect(body.providers[0]).toMatchObject({ id: "openai", configured: true });
		expect(JSON.stringify(body)).not.toContain("server-secret");
	});

	it("returns same-origin downloads as sanitized attachments", async () => {
		const response = await createApi().request("/api/download", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				filename: "../../diagram.mmd",
				data: btoa("flowchart LR\nA --> B"),
			}).toString(),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("content-disposition")).toBe(
			'attachment; filename="diagram.mmd"',
		);
		expect(response.headers.get("content-type")).toBe(
			"application/octet-stream",
		);
		expect(await response.text()).toBe("flowchart LR\nA --> B");
	});

	it("rejects malformed download payloads", async () => {
		const response = await createApi().request("/api/download", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				filename: "diagram.mmd",
				data: "not base64!",
			}).toString(),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: { code: "INVALID_DOWNLOAD" },
		});
	});

	it("rejects malformed and cross-site chat requests before model execution", async () => {
		const api = createApi();
		const malformed = await api.request("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: "{not-json",
		});
		const crossSite = await api.request("/api/chat", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "https://attacker.invalid",
			},
			body: "{}",
		});

		expect(malformed.status).toBe(400);
		expect(await malformed.json()).toMatchObject({
			error: { code: "INVALID_JSON" },
		});
		expect(crossSite.status).toBe(403);
		expect(await crossSite.json()).toMatchObject({
			error: { code: "CROSS_SITE_REQUEST" },
		});
	});

	it("rejects disabled providers before starting an agent run", async () => {
		const { snapshot } = createWorkspaceSnapshot({ "/a.ts": "old" });
		const response = await createApi().request("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				messages: [
					{
						id: "user-1",
						role: "user",
						parts: [{ type: "text", text: "Change it" }],
					},
				],
				providerId: "openai",
				modelId: "openai/gpt-5.4",
				workspace: snapshot,
			}),
		});

		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({
			error: { code: "PROVIDER_NOT_CONFIGURED" },
		});
	});

	it("rejects non-allowlisted models before resolving a paid model", async () => {
		const { snapshot } = createWorkspaceSnapshot({ "/a.ts": "old" });
		const modelResolver = vi.fn();
		const api = createApi({
			providerCatalog: new ProviderCatalog(
				new ObjectProviderConfigSource({ OPENAI_API_KEY: "server-secret" }),
			),
			modelResolver,
		});
		const response = await api.request("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				messages: [
					{
						id: "user-invalid-model",
						role: "user",
						parts: [{ type: "text", text: "Change it" }],
					},
				],
				providerId: "openai",
				modelId: "https://attacker.invalid/model",
				workspace: snapshot,
			}),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: { code: "MODEL_NOT_ALLOWED" },
		});
		expect(modelResolver).not.toHaveBeenCalled();
	});

	it("enforces the chat request body limit", async () => {
		const response = await createApi().request("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ oversized: "x".repeat(2 * 1024 * 1024) }),
		});

		expect(response.status).toBe(413);
		expect(await response.json()).toMatchObject({
			error: { code: "REQUEST_TOO_LARGE" },
		});
	});

	it("enforces Agent snapshot limits independently from the body limit", async () => {
		const modelResolver = vi.fn();
		const files = Object.fromEntries(
			Array.from({ length: 251 }, (_, index) => {
				const content = `file ${index}`;
				return [`/src/${index}.ts`, { content, hash: hashText(content) }];
			}),
		);
		const api = createApi({
			providerCatalog: new ProviderCatalog(
				new ObjectProviderConfigSource({ OPENAI_API_KEY: "server-secret" }),
			),
			modelResolver,
		});
		const response = await api.request("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				messages: [
					{
						id: "user-large-snapshot",
						role: "user",
						parts: [{ type: "text", text: "Inspect it" }],
					},
				],
				providerId: "openai",
				modelId: "openai/gpt-5.4",
				workspace: { revision: hashText("large-snapshot"), files },
			}),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: { code: "INVALID_SNAPSHOT" },
		});
		expect(modelResolver).not.toHaveBeenCalled();
	});

	it("does not write upstream error details to structured logs", async () => {
		const { snapshot } = createWorkspaceSnapshot({ "/a.ts": "old" });
		const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const api = createApi({
			providerCatalog: new ProviderCatalog(
				new ObjectProviderConfigSource({ OPENAI_API_KEY: "server-secret" }),
			),
			modelResolver: () => {
				throw new Error("server-secret and workspace contents");
			},
		});

		const response = await api.request("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				messages: [
					{
						id: "user-log-redaction",
						role: "user",
						parts: [{ type: "text", text: "workspace contents" }],
					},
				],
				providerId: "openai",
				modelId: "openai/gpt-5.4",
				workspace: snapshot,
			}),
		});
		const serializedLogs = JSON.stringify(log.mock.calls);
		log.mockRestore();

		expect(response.status).toBe(500);
		expect(serializedLogs).toContain("AGENT_START_FAILED");
		expect(serializedLogs).not.toContain("server-secret");
		expect(serializedLogs).not.toContain("workspace contents");
	});
});
