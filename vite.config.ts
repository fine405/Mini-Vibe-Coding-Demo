import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		chunkSizeWarningLimit: 1000, // Sandpack is ~960KB, raise limit
		rollupOptions: {
			output: {
				manualChunks(id) {
					// Monaco editor (~2MB)
					if (id.includes("monaco-editor") || id.includes("@monaco-editor")) {
						return "monaco";
					}
					// Sandpack preview (~500KB)
					if (id.includes("@codesandbox/sandpack")) {
						return "sandpack";
					}
					// Radix UI components
					if (id.includes("@radix-ui")) {
						return "radix-ui";
					}
					// Other vendor libraries
					if (
						id.includes("node_modules/zustand") ||
						id.includes("node_modules/immer") ||
						id.includes("node_modules/diff") ||
						id.includes("node_modules/jszip") ||
						id.includes("node_modules/cmdk")
					) {
						return "vendor";
					}
				},
			},
		},
	},
});
