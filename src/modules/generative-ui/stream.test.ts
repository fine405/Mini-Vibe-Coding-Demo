import {
	pipeJsonRender,
	SPEC_DATA_PART_TYPE,
	type StreamChunk,
} from "@json-render/core";
import { describe, expect, it } from "vitest";

async function collect(stream: ReadableStream<StreamChunk>) {
	const reader = stream.getReader();
	const chunks: StreamChunk[] = [];
	while (true) {
		const result = await reader.read();
		if (result.done) return chunks;
		chunks.push(result.value);
	}
}

describe("json-render AI SDK stream contract", () => {
	it("extracts JSONL patches while preserving prose and tool chunks", async () => {
		const toolChunk: StreamChunk = {
			type: "tool-input-available",
			toolCallId: "call-1",
			toolName: "web_search",
			input: { query: "json-render" },
		};
		const source = new ReadableStream<StreamChunk>({
			start(controller) {
				controller.enqueue({ type: "text-start", id: "answer" });
				controller.enqueue({
					type: "text-delta",
					id: "answer",
					delta: "Before\n```sp",
				});
				controller.enqueue({
					type: "text-delta",
					id: "answer",
					delta: 'ec\n{"op":"add","path":"/root","value":"root"}\n```\nAfter',
				});
				controller.enqueue({ type: "text-end", id: "answer" });
				controller.enqueue(toolChunk);
				controller.close();
			},
		});

		const chunks = await collect(pipeJsonRender(source));
		const text = chunks
			.filter(
				(chunk): chunk is Extract<StreamChunk, { type: "text-delta" }> =>
					chunk.type === "text-delta",
			)
			.map((chunk) => chunk.delta)
			.join("");
		const spec = chunks.find((chunk) => chunk.type === SPEC_DATA_PART_TYPE);

		expect(text).toContain("Before");
		expect(text).toContain("After");
		expect(text).not.toContain("```spec");
		expect(spec).toMatchObject({
			type: "data-spec",
			data: {
				type: "patch",
				patch: { op: "add", path: "/root", value: "root" },
			},
		});
		expect(chunks).toContain(toolChunk);
	});
});
