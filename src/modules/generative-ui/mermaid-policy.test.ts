import { describe, expect, it } from "vitest";
import { validateMermaidSource } from "@/modules/generative-ui/mermaid-policy";

describe("validateMermaidSource", () => {
	it.each([
		"flowchart LR\nA --> B",
		"sequenceDiagram\nAlice->>Bob: Hello",
		"stateDiagram-v2\n[*] --> Ready",
		"classDiagram\nclass User",
		"erDiagram\nUSER ||--o{ ORDER : places",
	])("accepts approved diagram source: %s", (source) => {
		expect(validateMermaidSource(source)).toEqual({ ok: true, source });
	});

	it.each([
		["unsupported type", "gantt\ntitle Roadmap"],
		["init directive", "%%{init: { 'theme': 'dark' }}%%\nflowchart LR\nA-->B"],
		["click handler", "flowchart LR\nA-->B\nclick A callback"],
		["external URL", "flowchart LR\nA[https://example.com]"],
		["HTML label", "flowchart LR\nA[<b>Unsafe</b>]"],
		["nested code fence", "flowchart LR\n```\nA --> B"],
	])("rejects %s", (_name, source) => {
		expect(validateMermaidSource(source).ok).toBe(false);
	});

	it("removes presentation-only syntax before validation", () => {
		expect(
			validateMermaidSource(
				'flowchart LR\nA["User Request<br/>Initial prompt"] --> B["Mastra Agent"]\nstyle A fill:#4A90D9,stroke:#2C5F8A,color:#fff',
			),
		).toEqual({
			ok: true,
			source:
				'flowchart LR\nA["User Request Initial prompt"] --> B["Mastra Agent"]',
		});
	});

	it("rejects source over 20 KiB", () => {
		const source = `flowchart LR\nA[${"x".repeat(20 * 1024)}]`;
		expect(validateMermaidSource(source)).toEqual({
			ok: false,
			reason: "Diagram source exceeds 20 KiB.",
		});
	});
});
