import { describe, expect, it } from "vitest";
import { createMemoryWorkspace } from "@/modules/workspace/workspace";

describe("Workspace", () => {
	it("creates a deterministic, filtered Agent snapshot with actionable omissions", async () => {
		const workspace = createMemoryWorkspace({
			"src/App.tsx": "export default function App() { return <main />; }",
			"/.env.local": "OPENAI_API_KEY=secret",
			"/node_modules/pkg/index.js": "module.exports = {}",
			"/public/logo.bin": "image\0data",
			"/src/large.ts": "x".repeat(128),
		});

		const first = await workspace.getSnapshot({ maxFileBytes: 64 });
		const second = await workspace.getSnapshot({ maxFileBytes: 64 });

		expect(first.snapshot).toEqual(second.snapshot);
		expect(Object.keys(first.snapshot.files)).toEqual(["/src/App.tsx"]);
		expect(first.snapshot.files["/src/App.tsx"]?.hash).toMatch(
			/^fnv1a64:[0-9a-f]{16}$/,
		);
		expect(first.omissions).toEqual([
			{ path: "/.env.local", reason: "secret", bytes: 21 },
			{ path: "/node_modules/pkg/index.js", reason: "blocked-path", bytes: 19 },
			{ path: "/public/logo.bin", reason: "binary", bytes: 10 },
			{ path: "/src/large.ts", reason: "file-too-large", bytes: 128 },
		]);
	});

	it("excludes common credential stores from Agent snapshots", async () => {
		const workspace = createMemoryWorkspace({
			"/.aws/credentials": "aws_access_key_id = secret",
			"/.netrc": "machine example.test password secret",
			"/.npmrc": "//registry.npmjs.org/:_authToken=secret",
			"/.pypirc": "password=secret",
			"/.docker/config.json": '{"auths":{"example.test":{"auth":"secret"}}}',
			"/src/index.ts": "export {};",
		});

		const preflight = await workspace.getSnapshot();

		expect(Object.keys(preflight.snapshot.files)).toEqual(["/src/index.ts"]);
		expect(preflight.omissions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: "/.aws/credentials",
					reason: "secret",
				}),
				expect.objectContaining({
					path: "/.docker/config.json",
					reason: "secret",
				}),
				expect.objectContaining({ path: "/.netrc", reason: "secret" }),
				expect.objectContaining({ path: "/.npmrc", reason: "secret" }),
				expect.objectContaining({ path: "/.pypirc", reason: "secret" }),
			]),
		);
	});

	it("applies a valid ChangeSet as one revisioned transaction", async () => {
		const workspace = createMemoryWorkspace({ "/src/a.ts": "old" });
		const { snapshot } = await workspace.getSnapshot();

		const result = await workspace.apply({
			id: "change-1",
			baseRevision: snapshot.revision,
			summary: "Update a and create b",
			changes: [
				{
					op: "update",
					path: "/src/a.ts",
					beforeHash: snapshot.files["/src/a.ts"].hash,
					content: "new",
				},
				{
					op: "create",
					path: "/src/b.ts",
					beforeHash: null,
					content: "created",
				},
			],
		});

		expect(result).toMatchObject({
			ok: true,
			transactionId: expect.any(String),
			affectedPaths: ["/src/a.ts", "/src/b.ts"],
		});
		const after = await workspace.getSnapshot();
		expect(after.snapshot.files["/src/a.ts"]?.content).toBe("new");
		expect(after.snapshot.files["/src/b.ts"]?.content).toBe("created");
		expect(after.snapshot.revision).not.toBe(snapshot.revision);
	});

	it("rejects an invalid operation without applying earlier operations", async () => {
		const workspace = createMemoryWorkspace({ "/src/a.ts": "old" });
		const { snapshot } = await workspace.getSnapshot();

		const result = await workspace.apply({
			id: "change-invalid",
			baseRevision: snapshot.revision,
			summary: "Must be atomic",
			changes: [
				{
					op: "update",
					path: "/src/a.ts",
					beforeHash: snapshot.files["/src/a.ts"].hash,
					content: "should-not-apply",
				},
				{
					op: "delete",
					path: "/src/missing.ts",
					beforeHash: "fnv1a64:0000000000000000",
				},
			],
		});

		expect(result).toEqual({
			ok: false,
			code: "PATH_CONFLICT",
			message: "Cannot delete missing path /src/missing.ts",
			failedPaths: ["/src/missing.ts"],
		});
		expect((await workspace.getSnapshot()).snapshot).toEqual(snapshot);
	});

	it("allows a stale base revision when only unrelated files changed", async () => {
		const workspace = createMemoryWorkspace({
			"/src/a.ts": "a-old",
			"/src/b.ts": "b-old",
		});
		const { snapshot } = await workspace.getSnapshot();

		const concurrent = await workspace.apply({
			id: "concurrent-b",
			baseRevision: snapshot.revision,
			summary: "Update an unrelated file",
			changes: [
				{
					op: "update",
					path: "/src/b.ts",
					beforeHash: snapshot.files["/src/b.ts"].hash,
					content: "b-new",
				},
			],
		});
		expect(concurrent.ok).toBe(true);

		const result = await workspace.apply({
			id: "agent-a",
			baseRevision: snapshot.revision,
			summary: "Update the inspected file",
			changes: [
				{
					op: "update",
					path: "/src/a.ts",
					beforeHash: snapshot.files["/src/a.ts"].hash,
					content: "a-new",
				},
			],
		});

		expect(result.ok).toBe(true);
		const after = (await workspace.getSnapshot()).snapshot;
		expect(after.files["/src/a.ts"].content).toBe("a-new");
		expect(after.files["/src/b.ts"].content).toBe("b-new");
	});

	it("rejects a stale ChangeSet when a target file changed", async () => {
		const workspace = createMemoryWorkspace({ "/src/a.ts": "old" });
		const { snapshot } = await workspace.getSnapshot();
		const concurrent = await workspace.apply({
			id: "concurrent-a",
			baseRevision: snapshot.revision,
			summary: "Edit the target",
			changes: [
				{
					op: "update",
					path: "/src/a.ts",
					beforeHash: snapshot.files["/src/a.ts"].hash,
					content: "user-edit",
				},
			],
		});
		expect(concurrent.ok).toBe(true);

		const result = await workspace.apply({
			id: "stale-agent-a",
			baseRevision: snapshot.revision,
			summary: "Overwrite the target",
			changes: [
				{
					op: "update",
					path: "/src/a.ts",
					beforeHash: snapshot.files["/src/a.ts"].hash,
					content: "agent-edit",
				},
			],
		});

		expect(result).toEqual({
			ok: false,
			code: "HASH_CONFLICT",
			message: "File changed after inspection: /src/a.ts",
			failedPaths: ["/src/a.ts"],
		});
		expect(
			(await workspace.getSnapshot()).snapshot.files["/src/a.ts"].content,
		).toBe("user-edit");
	});

	it("serializes concurrent transactions so independent edits are not lost", async () => {
		const workspace = createMemoryWorkspace({
			"/src/a.ts": "a-old",
			"/src/b.ts": "b-old",
		});
		const { snapshot } = await workspace.getSnapshot();

		const [first, second] = await Promise.all([
			workspace.apply({
				id: "parallel-a",
				baseRevision: snapshot.revision,
				summary: "Update a",
				changes: [
					{
						op: "update",
						path: "/src/a.ts",
						beforeHash: snapshot.files["/src/a.ts"].hash,
						content: "a-new",
					},
				],
			}),
			workspace.apply({
				id: "parallel-b",
				baseRevision: snapshot.revision,
				summary: "Update b",
				changes: [
					{
						op: "update",
						path: "/src/b.ts",
						beforeHash: snapshot.files["/src/b.ts"].hash,
						content: "b-new",
					},
				],
			}),
		]);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		const after = (await workspace.getSnapshot()).snapshot;
		expect(after.files["/src/a.ts"].content).toBe("a-new");
		expect(after.files["/src/b.ts"].content).toBe("b-new");
	});

	it("undoes an accepted transaction only while its applied revision is current", async () => {
		const workspace = createMemoryWorkspace({ "/src/a.ts": "old" });
		const { snapshot } = await workspace.getSnapshot();
		const applied = await workspace.apply({
			id: "change-undo",
			baseRevision: snapshot.revision,
			summary: "Update a",
			changes: [
				{
					op: "update",
					path: "/src/a.ts",
					beforeHash: snapshot.files["/src/a.ts"].hash,
					content: "new",
				},
			],
		});
		if (!applied.ok) throw new Error("Expected apply to succeed");

		const undone = await workspace.undo(applied.transactionId);

		expect(undone).toMatchObject({
			ok: true,
			revision: snapshot.revision,
			affectedPaths: ["/src/a.ts"],
		});
		expect((await workspace.getSnapshot()).snapshot).toEqual(snapshot);
		expect(await workspace.undo(applied.transactionId)).toEqual({
			ok: false,
			code: "TRANSACTION_NOT_FOUND",
			message: "Undo transaction was not found or was already used",
		});
	});

	it("previews file operations and line statistics without mutating the workspace", async () => {
		const workspace = createMemoryWorkspace({ "/a.ts": "old" });
		const { snapshot } = await workspace.getSnapshot();
		const changeSet = {
			id: "change-preview",
			baseRevision: snapshot.revision,
			summary: "Preview changes",
			changes: [
				{
					op: "update" as const,
					path: "/a.ts",
					beforeHash: snapshot.files["/a.ts"].hash,
					content: "new",
				},
				{
					op: "create" as const,
					path: "/b.ts",
					beforeHash: null,
					content: "one\ntwo",
				},
			],
		};

		expect(await workspace.preview(changeSet)).toMatchObject({
			ok: true,
			summary: "Preview changes",
			additions: 3,
			deletions: 1,
			files: [
				{ path: "/a.ts", op: "update", additions: 1, deletions: 1 },
				{ path: "/b.ts", op: "create", additions: 2, deletions: 0 },
			],
		});
		expect((await workspace.getSnapshot()).snapshot).toEqual(snapshot);
	});
});
