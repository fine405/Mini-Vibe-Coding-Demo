import { createFileRoute } from "@tanstack/react-router";
import { createApi } from "@/server/api";

const api = createApi();
const handleRequest = ({ request }: { request: Request }) => api.fetch(request);

export const Route = createFileRoute("/api/$")({
	server: {
		handlers: {
			GET: handleRequest,
			POST: handleRequest,
			PUT: handleRequest,
			PATCH: handleRequest,
			DELETE: handleRequest,
			OPTIONS: handleRequest,
		},
	},
});
