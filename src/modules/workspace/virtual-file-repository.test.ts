import { describe, expect, it, vi } from "vitest";
import type { VirtualFile } from "@/modules/fs/types";
import { VirtualFileWorkspaceRepository } from "@/modules/workspace/virtual-file-repository";

describe("VirtualFileWorkspaceRepository", () => {
	it("commits a workspace transaction once while preserving dirty-file semantics", async () => {
		let current: Record<string, VirtualFile> = {
			"/a.ts": { path: "/a.ts", content: "old", status: "clean" },
		};
		const replace = vi.fn((files: Record<string, VirtualFile>) => {
			current = files;
		});
		const repository = new VirtualFileWorkspaceRepository({
			read: () => current,
			replace,
		});

		await repository.write({ "/a.ts": "new", "/b.ts": "created" });

		expect(replace).toHaveBeenCalledTimes(1);
		expect(current).toEqual({
			"/a.ts": {
				path: "/a.ts",
				content: "new",
				status: "modified",
				originalContent: "old",
			},
			"/b.ts": { path: "/b.ts", content: "created", status: "new" },
		});
	});
});
