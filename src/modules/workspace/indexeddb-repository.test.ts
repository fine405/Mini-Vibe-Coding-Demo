import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { IndexedDbWorkspaceRepository } from "@/modules/workspace/indexeddb-repository";

const DB_NAME = "mini-lovable-workspace-test";

function deleteDatabase(): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(DB_NAME);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

function writeLegacyWorkspace(): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onerror = () => reject(request.error);
		request.onupgradeneeded = () =>
			request.result.createObjectStore("workspace");
		request.onsuccess = () => {
			const db = request.result;
			const transaction = db.transaction("workspace", "readwrite");
			transaction.objectStore("workspace").put(
				{
					filesByPath: {
						"/legacy.ts": {
							path: "/legacy.ts",
							content: "legacy",
							status: "clean",
						},
					},
					timestamp: 1,
				},
				"current-workspace",
			);
			transaction.oncomplete = () => {
				db.close();
				resolve();
			};
			transaction.onerror = () => reject(transaction.error);
		};
	});
}

describe("IndexedDbWorkspaceRepository", () => {
	afterEach(deleteDatabase);

	it("persists a schema-versioned workspace document", async () => {
		const repository = new IndexedDbWorkspaceRepository({ dbName: DB_NAME });

		await repository.write({
			"/src/App.tsx": "export default function App() {}",
		});

		expect(await repository.read()).toEqual({
			"/src/App.tsx": "export default function App() {}",
		});
	});

	it("reads the existing v1 virtual-file persistence format", async () => {
		await writeLegacyWorkspace();
		const repository = new IndexedDbWorkspaceRepository({ dbName: DB_NAME });

		expect(await repository.read()).toEqual({ "/legacy.ts": "legacy" });
	});
});
