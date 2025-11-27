/**
 * Worker manager for diff operations
 * Manages a single reusable worker instance and provides async API
 */

import type {
	ApplySelectedHunksPayload,
	ParseHunksPayload,
	WorkerRequest,
	WorkerResponse,
} from "./diff.worker";
import type { ParsedHunks } from "./hunk";

// Threshold for using worker (50KB or 1000 lines)
const WORKER_SIZE_THRESHOLD = 50 * 1024; // 50KB
const WORKER_LINE_THRESHOLD = 1000;

// Singleton worker instance
let worker: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<
	number,
	{
		resolve: (value: ParsedHunks | string) => void;
		reject: (error: Error) => void;
	}
>();

// Check if we're in a browser environment with Worker support
const isWorkerSupported = typeof Worker !== "undefined";

/**
 * Get or create the worker instance
 * Returns null if workers are not supported (e.g., in Node.js tests)
 */
function getWorker(): Worker | null {
	if (!isWorkerSupported) {
		return null;
	}

	if (!worker) {
		// Use Vite's worker import syntax
		worker = new Worker(new URL("./diff.worker.ts", import.meta.url), {
			type: "module",
		});

		worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
			const { id, type, result, error } = event.data;
			const pending = pendingRequests.get(id);

			if (pending) {
				pendingRequests.delete(id);
				if (type === "success" && result !== undefined) {
					pending.resolve(result);
				} else {
					pending.reject(new Error(error || "Unknown worker error"));
				}
			}
		};

		worker.onerror = (error) => {
			console.error("[DiffWorker] Worker error:", error);
			// Reject all pending requests
			for (const [id, pending] of pendingRequests) {
				pending.reject(new Error("Worker error"));
				pendingRequests.delete(id);
			}
		};
	}

	return worker;
}

/**
 * Check if content should use worker based on size
 * Returns false if workers are not supported (e.g., in Node.js tests)
 */
export function shouldUseWorker(content: string): boolean {
	// Workers not available in Node.js test environment
	if (!isWorkerSupported) {
		return false;
	}

	const size = new Blob([content]).size;
	const lines = content.split("\n").length;
	return size > WORKER_SIZE_THRESHOLD || lines > WORKER_LINE_THRESHOLD;
}

/**
 * Send a request to the worker and wait for response
 * Throws if worker is not available
 */
function sendWorkerRequest<T extends ParsedHunks | string>(
	type: WorkerRequest["type"],
	payload: ParseHunksPayload | ApplySelectedHunksPayload,
): Promise<T> {
	const workerInstance = getWorker();
	if (!workerInstance) {
		return Promise.reject(new Error("Worker not available"));
	}

	return new Promise((resolve, reject) => {
		const id = ++requestId;
		pendingRequests.set(id, {
			resolve: resolve as (value: ParsedHunks | string) => void,
			reject,
		});

		const request: WorkerRequest = { id, type, payload };
		workerInstance.postMessage(request);
	});
}

/**
 * Parse hunks using worker
 */
export function parseHunksInWorker(
	oldContent: string,
	newContent: string,
	path: string,
	op: "create" | "update" | "delete",
): Promise<ParsedHunks> {
	const payload: ParseHunksPayload = { oldContent, newContent, path, op };
	return sendWorkerRequest<ParsedHunks>("parseHunks", payload);
}

/**
 * Apply selected hunks using worker
 */
export function applySelectedHunksInWorker(
	oldContent: string,
	parsedHunks: ParsedHunks,
	selectedHunkIndices: Set<number>,
): Promise<string> {
	const payload: ApplySelectedHunksPayload = {
		oldContent,
		parsedHunks,
		selectedHunkIndices: Array.from(selectedHunkIndices),
	};
	return sendWorkerRequest<string>("applySelectedHunks", payload);
}

/**
 * Terminate the worker (for cleanup)
 */
export function terminateWorker(): void {
	if (worker) {
		worker.terminate();
		worker = null;
		pendingRequests.clear();
	}
}

/**
 * Pre-initialize the worker (call on app load for faster first use)
 */
export function preInitializeWorker(): void {
	getWorker();
}
