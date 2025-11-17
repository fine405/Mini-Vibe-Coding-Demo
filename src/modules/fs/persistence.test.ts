import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearWorkspace,
	hasWorkspace,
	loadWorkspace,
	saveWorkspace,
} from "./persistence";
import type { VirtualFile } from "./types";

describe("Persistence", () => {
	// Mock IndexedDB
	let mockStore: Record<string, any> = {};

	beforeEach(() => {
		mockStore = {};

		// Mock indexedDB
		global.indexedDB = {
			open: vi.fn(() => {
				const request = {
					onsuccess: null as any,
					onerror: null as any,
					onupgradeneeded: null as any,
					result: {
						transaction: vi.fn(() => ({
							objectStore: vi.fn(() => ({
								get: vi.fn((key: string) => {
									const getRequest = {
										onsuccess: null as any,
										onerror: null as any,
										result: mockStore[key],
									};
									setTimeout(() => {
										if (getRequest.onsuccess) {
											getRequest.onsuccess({ target: getRequest });
										}
									}, 0);
									return getRequest;
								}),
								put: vi.fn((value: any, key: string) => {
									const putRequest = {
										onsuccess: null as any,
										onerror: null as any,
									};
									mockStore[key] = value;
									setTimeout(() => {
										if (putRequest.onsuccess) {
											putRequest.onsuccess({});
										}
									}, 0);
									return putRequest;
								}),
								delete: vi.fn((key: string) => {
									const deleteRequest = {
										onsuccess: null as any,
										onerror: null as any,
									};
									delete mockStore[key];
									setTimeout(() => {
										if (deleteRequest.onsuccess) {
											deleteRequest.onsuccess({});
										}
									}, 0);
									return deleteRequest;
								}),
							})),
						})),
						createObjectStore: vi.fn(),
					},
				};
				setTimeout(() => {
					if (request.onsuccess) {
						request.onsuccess({ target: request });
					}
				}, 0);
				return request;
			}),
		} as any;
	});

	const WORKSPACE_KEY = "current-workspace";

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
