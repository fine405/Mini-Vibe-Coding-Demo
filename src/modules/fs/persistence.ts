import type { VirtualFile } from "./types";

const DB_NAME = "mini-lovable-db";
const DB_VERSION = 1;
const STORE_NAME = "workspace";
const WORKSPACE_KEY = "current-workspace";

/**
 * Workspace data structure for persistence
 */
export interface WorkspaceData {
	filesByPath: Record<string, VirtualFile>;
	timestamp: number;
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
	});
}

/**
 * Save workspace to IndexedDB
 */
export async function saveWorkspace(
	filesByPath: Record<string, VirtualFile>,
): Promise<void> {
	try {
		const db = await openDB();
		const transaction = db.transaction([STORE_NAME], "readwrite");
		const store = transaction.objectStore(STORE_NAME);

		const data: WorkspaceData = {
			filesByPath,
			timestamp: Date.now(),
		};

		return new Promise((resolve, reject) => {
			const request = store.put(data, WORKSPACE_KEY);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.error("Failed to save workspace:", error);
		throw error;
	}
}

/**
 * Load workspace from IndexedDB
 */
export async function loadWorkspace(): Promise<WorkspaceData | null> {
	try {
		const db = await openDB();
		const transaction = db.transaction([STORE_NAME], "readonly");
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.get(WORKSPACE_KEY);
			request.onsuccess = () => {
				const data = request.result as WorkspaceData | undefined;
				resolve(data || null);
			};
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.error("Failed to load workspace:", error);
		return null;
	}
}

/**
 * Clear workspace from IndexedDB
 */
export async function clearWorkspace(): Promise<void> {
	try {
		const db = await openDB();
		const transaction = db.transaction([STORE_NAME], "readwrite");
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.delete(WORKSPACE_KEY);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.error("Failed to clear workspace:", error);
		throw error;
	}
}

/**
 * Check if workspace exists in IndexedDB
 */
export async function hasWorkspace(): Promise<boolean> {
	const data = await loadWorkspace();
	return data !== null;
}
