import { normalizeWorkspaceFiles } from "@/modules/workspace/domain";
import type {
	WorkspaceFiles,
	WorkspaceRepository,
} from "@/modules/workspace/types";

function cloneFiles(files: WorkspaceFiles): WorkspaceFiles {
	return { ...files };
}

export class MemoryWorkspaceRepository implements WorkspaceRepository {
	#files: WorkspaceFiles;

	constructor(files: WorkspaceFiles = {}) {
		this.#files = normalizeWorkspaceFiles(files);
	}

	async read(): Promise<WorkspaceFiles> {
		return cloneFiles(this.#files);
	}

	async write(files: WorkspaceFiles): Promise<void> {
		this.#files = normalizeWorkspaceFiles(files);
	}
}
