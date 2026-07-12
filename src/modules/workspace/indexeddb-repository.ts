import {
	computeWorkspaceRevision,
	normalizeWorkspaceFiles,
} from "@/modules/workspace/domain";
import type {
	WorkspaceFiles,
	WorkspaceRepository,
} from "@/modules/workspace/types";

const DEFAULT_DB_NAME = "mini-lovable-db";
const DB_VERSION = 2;
const STORE_NAME = "workspace";
const WORKSPACE_KEY = "current-workspace";

interface WorkspaceDocumentV2 {
	schemaVersion: 2;
	revision: string;
	files: WorkspaceFiles;
	updatedAt: number;
}

interface LegacyWorkspaceDocument {
	filesByPath?: Record<string, { content?: unknown }>;
}

export interface IndexedDbWorkspaceRepositoryOptions {
	dbName?: string;
}

export class IndexedDbWorkspaceRepository implements WorkspaceRepository {
	readonly #dbName: string;

	constructor(options: IndexedDbWorkspaceRepositoryOptions = {}) {
		this.#dbName = options.dbName ?? DEFAULT_DB_NAME;
	}

	async read(): Promise<WorkspaceFiles> {
		const db = await openDatabase(this.#dbName);
		try {
			const transaction = db.transaction(STORE_NAME, "readonly");
			const value = await requestResult<unknown>(
				transaction.objectStore(STORE_NAME).get(WORKSPACE_KEY),
			);
			await transactionDone(transaction);
			return workspaceFilesFromDocument(value);
		} finally {
			db.close();
		}
	}

	async write(inputFiles: WorkspaceFiles): Promise<void> {
		const files = normalizeWorkspaceFiles(inputFiles);
		const document: WorkspaceDocumentV2 = {
			schemaVersion: 2,
			revision: computeWorkspaceRevision(files),
			files,
			updatedAt: Date.now(),
		};
		const db = await openDatabase(this.#dbName);
		try {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			transaction.objectStore(STORE_NAME).put(document, WORKSPACE_KEY);
			await transactionDone(transaction);
		} finally {
			db.close();
		}
	}

	async clear(): Promise<void> {
		const db = await openDatabase(this.#dbName);
		try {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			transaction.objectStore(STORE_NAME).delete(WORKSPACE_KEY);
			await transactionDone(transaction);
		} finally {
			db.close();
		}
	}
}

function workspaceFilesFromDocument(value: unknown): WorkspaceFiles {
	if (!value || typeof value !== "object") return {};
	const document = value as WorkspaceDocumentV2 & LegacyWorkspaceDocument;
	if (document.schemaVersion === 2 && document.files) {
		return normalizeWorkspaceFiles(document.files);
	}
	if (!document.filesByPath) return {};

	const migrated: WorkspaceFiles = {};
	for (const [path, file] of Object.entries(document.filesByPath)) {
		if (typeof file?.content === "string") migrated[path] = file.content;
	}
	return normalizeWorkspaceFiles(migrated);
}

function openDatabase(dbName: string): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(dbName, DB_VERSION);
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
