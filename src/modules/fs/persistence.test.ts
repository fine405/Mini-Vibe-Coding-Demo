import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceData } from "./persistence";
import {
	clearWorkspace,
	hasWorkspace,
	loadWorkspace,
	saveWorkspace,
} from "./persistence";
import type { VirtualFile } from "./types";

type MockStore = Record<string, WorkspaceData | undefined>;

const WORKSPACE_KEY = "current-workspace";

function createEventTargetShim(): Pick<
	EventTarget,
	"addEventListener" | "removeEventListener" | "dispatchEvent"
> {
	return {
		addEventListener: (
			_type: string,
			_listener: EventListenerOrEventListenerObject | null,
			_options?: boolean | AddEventListenerOptions,
		) => undefined,
		removeEventListener: (
			_type: string,
			_listener: EventListenerOrEventListenerObject | null,
			_options?: boolean | EventListenerOptions,
		) => undefined,
		dispatchEvent: (_event: Event) => true,
	};
}

function createRequest<T>(result: T): IDBRequest<T> {
	return {
		...createEventTargetShim(),
		result,
		error: null,
		readyState: "pending" as IDBRequestReadyState,
		source: null,
		transaction: null,
		onsuccess: null,
		onerror: null,
	} as IDBRequest<T>;
}

function createOpenRequest(db: IDBDatabase): IDBOpenDBRequest {
	return {
		...createRequest(db),
		onblocked: null,
		onupgradeneeded: null,
	} as IDBOpenDBRequest;
}

function createObjectStore(mockStore: MockStore) {
	return {
		get: vi.fn((key: IDBValidKey) => {
			const getRequest = createRequest(mockStore[String(key)]);
			setTimeout(() => {
				getRequest.onsuccess?.call(getRequest, new Event("success"));
			}, 0);
			return getRequest;
		}),
		put: vi.fn((value: WorkspaceData, key: IDBValidKey) => {
			const putRequest = createRequest<undefined>(undefined);
			mockStore[String(key)] = value;
			setTimeout(() => {
				putRequest.onsuccess?.call(putRequest, new Event("success"));
			}, 0);
			return putRequest;
		}),
		delete: vi.fn((key: IDBValidKey) => {
			const deleteRequest = createRequest<undefined>(undefined);
			delete mockStore[String(key)];
			setTimeout(() => {
				deleteRequest.onsuccess?.call(deleteRequest, new Event("success"));
			}, 0);
			return deleteRequest;
		}),
	} as unknown as IDBObjectStore;
}

describe("Persistence", () => {
	let mockStore: MockStore = {};

	beforeEach(() => {
		mockStore = {};

		const objectStore = createObjectStore(mockStore);
		const mockDatabase = {
			transaction: vi.fn(
				() =>
					({
						objectStore: () => objectStore,
					}) as IDBTransaction,
			),
			createObjectStore: vi.fn(),
			objectStoreNames: {
				length: 1,
				item: () => null,
				contains: () => true,
			} as unknown as DOMStringList,
		} as unknown as IDBDatabase;

		// Mock indexedDB
		global.indexedDB = {
			open: vi.fn(() => {
				const request = createOpenRequest(mockDatabase);
				setTimeout(() => {
					request.onsuccess?.call(request, new Event("success"));
				}, 0);
				return request;
			}),
		} as unknown as IDBFactory;
	});

	it("should save workspace to IndexedDB", async () => {
		const filesByPath: Record<string, VirtualFile> = {
			"/test.js": {
				path: "/test.js",
				content: "console.log('test');",
				status: "clean",
			},
		};

		await saveWorkspace(filesByPath);

		const stored = mockStore[WORKSPACE_KEY];
		expect(stored).toBeDefined();
		expect(stored.filesByPath).toEqual(filesByPath);
		expect(stored.timestamp).toBeGreaterThan(0);
	});

	it("should load workspace from IndexedDB", async () => {
		const filesByPath: Record<string, VirtualFile> = {
			"/app.js": {
				path: "/app.js",
				content: "const x = 1;",
				status: "modified",
			},
		};

		mockStore[WORKSPACE_KEY] = {
			filesByPath,
			timestamp: Date.now(),
		};

		const loaded = await loadWorkspace();

		expect(loaded?.filesByPath).toEqual(filesByPath);
		expect(loaded?.timestamp).toBeGreaterThan(0);
	});

	it("should return null when no workspace exists", async () => {
		const loaded = await loadWorkspace();
		expect(loaded).toBeNull();
	});

	it("should check if workspace exists", async () => {
		expect(await hasWorkspace()).toBe(false);

		mockStore[WORKSPACE_KEY] = {
			filesByPath: {},
			timestamp: Date.now(),
		};

		expect(await hasWorkspace()).toBe(true);
	});

	it("should clear workspace from IndexedDB", async () => {
		mockStore[WORKSPACE_KEY] = {
			filesByPath: {},
			timestamp: Date.now(),
		};

		expect(await hasWorkspace()).toBe(true);

		await clearWorkspace();

		expect(await hasWorkspace()).toBe(false);
		expect(mockStore[WORKSPACE_KEY]).toBeUndefined();
	});

	it("should handle save and load cycle", async () => {
		const original: Record<string, VirtualFile> = {
			"/index.js": {
				path: "/index.js",
				content: "import React from 'react';",
				status: "clean",
			},
			"/App.js": {
				path: "/App.js",
				content: "export default function App() {}",
				status: "new",
			},
		};

		await saveWorkspace(original);
		const loaded = await loadWorkspace();

		expect(loaded?.filesByPath).toEqual(original);
		expect(loaded?.timestamp).toBeGreaterThan(0);
	});
});
