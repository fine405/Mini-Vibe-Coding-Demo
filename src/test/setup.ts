import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cleanup after each test
afterEach(() => {
	cleanup();
});

// Mock IndexedDB
const indexedDB = {
	open: () => ({
		result: {
			transaction: () => ({
				objectStore: () => ({
					get: () => ({ onsuccess: null, onerror: null }),
					put: () => ({ onsuccess: null, onerror: null }),
					delete: () => ({ onsuccess: null, onerror: null }),
				}),
			}),
			createObjectStore: () => ({}),
		},
		onsuccess: null,
		onerror: null,
		onupgradeneeded: null,
	}),
};

global.indexedDB = indexedDB as unknown as IDBFactory;
