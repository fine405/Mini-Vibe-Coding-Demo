import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import path from "path";

function createClientChunks(id: string): string | undefined {
	if (id.includes("monaco-editor") || id.includes("@monaco-editor")) {
		return "monaco";
	}
	if (id.includes("@codesandbox/sandpack")) return "sandpack";
	if (id.includes("@radix-ui")) return "radix-ui";
	if (
		id.includes("node_modules/zustand") ||
		id.includes("node_modules/immer") ||
		id.includes("node_modules/diff") ||
		id.includes("node_modules/jszip") ||
		id.includes("node_modules/cmdk")
	) {
		return "vendor";
	}
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		tailwindcss(),
		tanstackStart({
			spa: {
				enabled: true,
			},
		}),
		nitro(),
		react(),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		chunkSizeWarningLimit: 1000,
	},
	environments: {
		client: {
			build: {
				rollupOptions: {
					output: { manualChunks: createClientChunks },
				},
			},
		},
	},
});
