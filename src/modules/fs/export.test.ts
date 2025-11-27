import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import { importProjectFromZip } from "./export";

// Mock URL and document APIs for export tests
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
const mockRevokeObjectURL = vi.fn();
const mockClick = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();

vi.stubGlobal("URL", {
	createObjectURL: mockCreateObjectURL,
	revokeObjectURL: mockRevokeObjectURL,
});

vi.stubGlobal("document", {
	createElement: vi.fn(() => ({
		href: "",
		download: "",
		click: mockClick,
	})),
	body: {
		appendChild: mockAppendChild,
		removeChild: mockRemoveChild,
	},
});

describe("ZIP Export/Import", () => {
	describe("importProjectFromZip", () => {
		it("should import files from a valid ZIP", async () => {
			// Create a mock ZIP file
			const zip = new JSZip();
			zip.file(
				"App.js",
				"export default function App() { return <div>Hello</div>; }",
			);
			zip.file("index.js", 'import App from "./App";');
			zip.file("components/Button.js", "export function Button() {}");

			const blob = await zip.generateAsync({ type: "blob" });
			const file = new File([blob], "project.zip", { type: "application/zip" });

			const result = await importProjectFromZip(file);

			expect(result["/App.js"]).toBeDefined();
			expect(result["/App.js"].path).toBe("/App.js");
			expect(result["/App.js"].status).toBe("clean");
			expect(result["/App.js"].content).toContain("Hello");

			expect(result["/index.js"]).toBeDefined();
			expect(result["/components/Button.js"]).toBeDefined();
			expect(result["/components/Button.js"].path).toBe(
				"/components/Button.js",
			);
		});

		it("should throw error for empty ZIP", async () => {
			const zip = new JSZip();
			const blob = await zip.generateAsync({ type: "blob" });
			const file = new File([blob], "empty.zip", { type: "application/zip" });

			await expect(importProjectFromZip(file)).rejects.toThrow(
				"ZIP file contains no valid files",
			);
		});

		it("should skip directories in ZIP", async () => {
			const zip = new JSZip();
			zip.folder("src");
			zip.file("src/App.js", "content");

			const blob = await zip.generateAsync({ type: "blob" });
			const file = new File([blob], "project.zip", { type: "application/zip" });

			const result = await importProjectFromZip(file);

			// Should only have the file, not the directory
			expect(Object.keys(result)).toHaveLength(1);
			expect(result["/src/App.js"]).toBeDefined();
		});
	});
});
