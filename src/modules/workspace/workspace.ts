import {
	createChangePreview,
	createWorkspaceSnapshot,
	prepareWorkspaceTransaction,
} from "@/modules/workspace/domain";
import { materializeHunkSelection } from "@/modules/workspace/hunk-selection";
import { MemoryWorkspaceRepository } from "@/modules/workspace/repository";
import type {
	ApplyResult,
	ChangePreview,
	ChangeSelection,
	PreparedWorkspaceTransaction,
	SnapshotOptions,
	SnapshotPreflight,
	UndoResult,
	WorkspaceChangeSet,
	WorkspaceFiles,
	WorkspaceRepository,
} from "@/modules/workspace/types";

export class WorkspaceService {
	readonly #transactions = new Map<string, PreparedWorkspaceTransaction>();
	#mutationQueue: Promise<void> = Promise.resolve();

	constructor(private readonly repository: WorkspaceRepository) {}

	async getSnapshot(options?: SnapshotOptions): Promise<SnapshotPreflight> {
		await this.waitForMutations();
		return createWorkspaceSnapshot(await this.repository.read(), options);
	}

	async preview(
		changeSet: WorkspaceChangeSet,
		selection?: ChangeSelection,
	): Promise<ChangePreview> {
		await this.waitForMutations();
		const files = await this.repository.read();
		if (selection?.changeIndices && selection.hunkIndicesByChange) {
			return {
				ok: false,
				code: "INVALID_CHANGESET",
				message: "Choose either file changes or hunks, not both",
				failedPaths: [],
			};
		}
		const selected = selection?.hunkIndicesByChange
			? await materializeHunkSelection(
					changeSet,
					files,
					selection.hunkIndicesByChange,
				)
			: changeSet;
		if ("ok" in selected) return selected;
		return createChangePreview(files, selected, selection);
	}

	async apply(
		changeSet: WorkspaceChangeSet,
		selection?: ChangeSelection,
	): Promise<ApplyResult> {
		return this.enqueueMutation(() => this.#apply(changeSet, selection));
	}

	async #apply(
		changeSet: WorkspaceChangeSet,
		selection?: ChangeSelection,
	): Promise<ApplyResult> {
		const files = await this.repository.read();
		if (selection?.changeIndices && selection.hunkIndicesByChange) {
			return {
				ok: false,
				code: "INVALID_CHANGESET",
				message: "Choose either file changes or hunks, not both",
				failedPaths: [],
			};
		}
		const selected = selection?.hunkIndicesByChange
			? await materializeHunkSelection(
					changeSet,
					files,
					selection.hunkIndicesByChange,
				)
			: changeSet;
		if ("ok" in selected) return selected;
		const prepared = prepareWorkspaceTransaction(files, selected, selection);
		if ("ok" in prepared) return prepared;

		await this.repository.write(prepared.files);
		const transactionId = createTransactionId(selected.id);
		this.#transactions.set(transactionId, prepared);
		return {
			ok: true,
			transactionId,
			previousRevision: prepared.previousRevision,
			revision: prepared.revision,
			affectedPaths: prepared.affectedPaths,
		};
	}

	async undo(transactionId: string): Promise<UndoResult> {
		return this.enqueueMutation(() => this.#undo(transactionId));
	}

	async #undo(transactionId: string): Promise<UndoResult> {
		const transaction = this.#transactions.get(transactionId);
		if (!transaction) {
			return {
				ok: false,
				code: "TRANSACTION_NOT_FOUND",
				message: "Undo transaction was not found or was already used",
			};
		}

		const files = await this.repository.read();
		const prepared = prepareWorkspaceTransaction(files, transaction.inverse);
		if ("ok" in prepared) {
			return {
				ok: false,
				code: "UNDO_CONFLICT",
				message: "Workspace changed after this transaction was applied",
			};
		}

		await this.repository.write(prepared.files);
		this.#transactions.delete(transactionId);
		return {
			ok: true,
			revision: prepared.revision,
			affectedPaths: prepared.affectedPaths,
		};
	}

	protected enqueueMutation<T>(operation: () => Promise<T> | T): Promise<T> {
		const execute = () => Promise.resolve(operation());
		const result = this.#mutationQueue.then(execute, execute);
		this.#mutationQueue = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}

	protected async waitForMutations(): Promise<void> {
		await this.#mutationQueue;
	}
}

function createTransactionId(changeSetId: string): string {
	const id =
		globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
	return `workspace:${changeSetId}:${id}`;
}

export function createMemoryWorkspace(files: WorkspaceFiles = {}) {
	return new WorkspaceService(new MemoryWorkspaceRepository(files));
}
