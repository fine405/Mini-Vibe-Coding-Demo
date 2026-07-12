import { describe, expect, it } from "vitest";
import { createWorkspaceSnapshot, hashText } from "@/modules/workspace/domain";
import {
	RunWorkspace,
	type RunWorkspaceError,
} from "@/server/agent/run-workspace";

describe("RunWorkspace", () => {
	it("requires inspection before mutation and finalizes an isolated ChangeSet", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/App.tsx": "export default function App() { return null; }",
			"/src/old.ts": "delete me",
		});
		const run = new RunWorkspace(snapshot);

		expect(() =>
			run.writeFile(
				"/src/App.tsx",
				"export default function App() { return <main />; }",
			),
		).toThrowError(
			expect.objectContaining<Partial<RunWorkspaceError>>({
				code: "READ_REQUIRED",
			}),
		);

		run.readFile("/src/App.tsx");
		run.readFile("/src/old.ts");
		run.writeFile(
			"/src/App.tsx",
			"export default function App() { return <main />; }",
		);
		run.writeFile("/src/new.ts", "export const value = 1;");
		run.deleteFile("/src/old.ts");

		const changeSet = run.finalize("Implement the requested UI");

		expect(changeSet).toEqual({
			id: expect.stringMatching(/^agent:/),
			baseRevision: snapshot.revision,
			summary: "Implement the requested UI",
			changes: [
				{
					op: "update",
					path: "/src/App.tsx",
					beforeHash: snapshot.files["/src/App.tsx"].hash,
					content: "export default function App() { return <main />; }",
				},
				{
					op: "create",
					path: "/src/new.ts",
					beforeHash: null,
					content: "export const value = 1;",
				},
				{
					op: "delete",
					path: "/src/old.ts",
					beforeHash: snapshot.files["/src/old.ts"].hash,
				},
			],
		});
		expect(snapshot.files["/src/App.tsx"].content).toContain("return null");
	});

	it("enforces independent file-count and total-byte snapshot limits", () => {
		const tooManyFiles = Object.fromEntries(
			Array.from({ length: 251 }, (_, index) => {
				const content = `file ${index}`;
				return [`/src/${index}.ts`, { content, hash: hashText(content) }];
			}),
		);
		expect(
			() =>
				new RunWorkspace({
					revision: hashText("too-many-files"),
					files: tooManyFiles,
				}),
		).toThrowError(
			expect.objectContaining<Partial<RunWorkspaceError>>({
				code: "INVALID_SNAPSHOT",
			}),
		);

		const content = "x".repeat(240 * 1024);
		const tooManyBytes = Object.fromEntries(
			Array.from({ length: 9 }, (_, index) => [
				`/src/large-${index}.ts`,
				{ content, hash: hashText(content) },
			]),
		);
		expect(
			() =>
				new RunWorkspace({
					revision: hashText("too-many-bytes"),
					files: tooManyBytes,
				}),
		).toThrowError(
			expect.objectContaining<Partial<RunWorkspaceError>>({
				code: "INVALID_SNAPSHOT",
			}),
		);
	});

	it("rejects unsafe regex syntax while preserving bounded regex search", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/App.tsx": "export default function App() { return null; }",
		});
		const run = new RunWorkspace(snapshot);

		expect(() => run.searchFiles("(a+)+$", true)).toThrowError(
			expect.objectContaining<Partial<RunWorkspaceError>>({
				code: "INVALID_QUERY",
			}),
		);
		expect(run.searchFiles("^export.*App", true)).toEqual([
			expect.objectContaining({ path: "/src/App.tsx", line: 1 }),
		]);

		const controller = new AbortController();
		controller.abort();
		expect(() => run.searchFiles("export", false, controller.signal)).toThrow();
	});
});
