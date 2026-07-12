import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	globalIgnores(["dist", ".output", "src/routeTree.gen.ts"]),
	{
		files: ["**/*.{ts,tsx}"],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
		],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
		},
	},
	{
		files: ["src/components/ai-elements/**/*.tsx"],
		rules: {
			// Registry code supports async syntax highlighting by invalidating an
			// internal cache ref during render; keep upstream behavior isolated here.
			"react-hooks/refs": "off",
			// Motion's cached polymorphic component factory is stable at runtime but
			// cannot be proven static by the React compiler lint.
			"react-hooks/static-components": "off",
		},
	},
	{
		files: [
			"src/components/ai-elements/**/*.tsx",
			"src/components/ui/**/*.tsx",
			"src/modules/tour/Tour.tsx",
		],
		rules: {
			// Generated component registries and the tour provider intentionally
			// colocate contexts/variants with their components.
			"react-refresh/only-export-components": "off",
		},
	},
]);
