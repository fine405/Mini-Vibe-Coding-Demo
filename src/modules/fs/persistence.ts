import type { VirtualFile } from "@/modules/fs/types";
import { computeWorkspaceRevision } from "@/modules/workspace/domain";
import type { WorkspaceFiles } from "@/modules/workspace/types";

const DB_NAME = "mini-lovable-db";
const DB_VERSION = 2;
const STORE_NAME = "workspace";
const WORKSPACE_KEY = "current-workspace";
const DEFAULT_SAVE_DELAY_MS = 300;

export interface WorkspaceData {
	schemaVersion: 2;
	filesByPath: Record<string, VirtualFile>;
	files: WorkspaceFiles;
	revision: string;
	timestamp: number;
}

interface LegacyWorkspaceData {
	filesByPath?: Record<string, VirtualFile>;
	timestamp?: number;
}

let pendingFiles: Record<string, VirtualFile> | undefined;
let pendingTimer: ReturnType<typeof setTimeout> | undefined;

function toWorkspaceFiles(
	filesByPath: Record<string, VirtualFile>,
): WorkspaceFiles {
	return Object.fromEntries(
		Object.entries(filesByPath).map(([path, file]) => [path, file.content]),
	);
}

function cloneVirtualFiles(
	filesByPath: Record<string, VirtualFile>,
): Record<string, VirtualFile> {
	return Object.fromEntries(
		Object.entries(filesByPath).map(([path, file]) => [path, { ...file }]),
	);
}

function createWorkspaceData(
	filesByPath: Record<string, VirtualFile>,
): WorkspaceData {
	const files = toWorkspaceFiles(filesByPath);
	return {
		schemaVersion: 2,
		filesByPath: cloneVirtualFiles(filesByPath),
		files,
		revision: computeWorkspaceRevision(files),
		timestamp: Date.now(),
	};
}

function parseWorkspaceData(value: unknown): WorkspaceData | null {
	if (!value || typeof value !== "object") return null;
	const data = value as Partial<WorkspaceData> & LegacyWorkspaceData;
	if (data.filesByPath) return createWorkspaceData(data.filesByPath);
	if (data.schemaVersion !== 2 || !data.files) return null;

	const filesByPath = Object.fromEntries(
		Object.entries(data.files).map(([path, content]) => [
			path,
			{ path, content, status: "clean" as const },
		]),
	);
	return createWorkspaceData(filesByPath);
}

export async function saveWorkspace(
	filesByPath: Record<string, VirtualFile>,
): Promise<void> {
	if (pendingTimer) clearTimeout(pendingTimer);
	pendingTimer = undefined;
	pendingFiles = undefined;
	const db = await openDatabase();
	try {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		transaction
			.objectStore(STORE_NAME)
			.put(createWorkspaceData(filesByPath), WORKSPACE_KEY);
		await transactionDone(transaction);
	} finally {
		db.close();
	}
}

export function scheduleWorkspaceSave(
	filesByPath: Record<string, VirtualFile>,
	delayMs = DEFAULT_SAVE_DELAY_MS,
): void {
	pendingFiles = cloneVirtualFiles(filesByPath);
	if (pendingTimer) clearTimeout(pendingTimer);
	pendingTimer = setTimeout(() => {
		const files = pendingFiles;
		pendingFiles = undefined;
		pendingTimer = undefined;
		if (files) saveWorkspace(files).catch(console.error);
	}, delayMs);
}

export async function flushScheduledWorkspaceSave(): Promise<void> {
	if (pendingTimer) clearTimeout(pendingTimer);
	pendingTimer = undefined;
	const files = pendingFiles;
	pendingFiles = undefined;
	if (files) await saveWorkspace(files);
}

export function installWorkspacePersistenceFlush(): () => void {
	const flush = () => {
		void flushScheduledWorkspaceSave().catch((error: unknown) => {
			console.error("Failed to flush workspace persistence", error);
		});
	};
	const flushWhenHidden = () => {
		if (document.visibilityState === "hidden") flush();
	};
	window.addEventListener("pagehide", flush);
	document.addEventListener("visibilitychange", flushWhenHidden);
	return () => {
		window.removeEventListener("pagehide", flush);
		document.removeEventListener("visibilitychange", flushWhenHidden);
	};
}

export async function loadWorkspace(): Promise<WorkspaceData | null> {
	const db = await openDatabase();
	try {
		const transaction = db.transaction(STORE_NAME, "readonly");
		const value = await requestResult<unknown>(
			transaction.objectStore(STORE_NAME).get(WORKSPACE_KEY),
		);
		await transactionDone(transaction);
		return parseWorkspaceData(value);
	} catch (error) {
		console.error("Failed to load workspace:", error);
		return null;
	} finally {
		db.close();
	}
}

export async function clearWorkspace(): Promise<void> {
	if (pendingTimer) clearTimeout(pendingTimer);
	pendingTimer = undefined;
	pendingFiles = undefined;
	const db = await openDatabase();
	try {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		transaction.objectStore(STORE_NAME).delete(WORKSPACE_KEY);
		await transactionDone(transaction);
	} finally {
		db.close();
	}
}

export async function hasWorkspace(): Promise<boolean> {
	return (await loadWorkspace()) !== null;
}

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
	});
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error);
	});
}
