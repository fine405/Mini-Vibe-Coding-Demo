import type { VirtualFile } from "@/modules/fs/types";
import { normalizeWorkspaceFiles } from "@/modules/workspace/domain";
import type {
	WorkspaceFiles,
	WorkspaceRepository,
} from "@/modules/workspace/types";

export interface VirtualFileWorkspacePort {
	read(): Record<string, VirtualFile>;
	replace(files: Record<string, VirtualFile>): void;
}

export class VirtualFileWorkspaceRepository implements WorkspaceRepository {
	constructor(private readonly port: VirtualFileWorkspacePort) {}

	async read(): Promise<WorkspaceFiles> {
		return Object.fromEntries(
			Object.entries(this.port.read()).map(([path, file]) => [
				path,
				file.content,
			]),
		);
	}

	async write(inputFiles: WorkspaceFiles): Promise<void> {
		const files = normalizeWorkspaceFiles(inputFiles);
		const current = this.port.read();
		const next: Record<string, VirtualFile> = {};

		for (const [path, content] of Object.entries(files)) {
			const existing = current[path];
			if (!existing) {
				next[path] = { path, content, status: "new" };
				continue;
			}
			if (existing.content === content) {
				next[path] = { ...existing };
				continue;
			}

			const originalContent = existing.originalContent ?? existing.content;
			if (existing.status !== "new" && content === originalContent) {
				next[path] = { path, content, status: "clean" };
			} else {
				next[path] = {
					path,
					content,
					status: existing.status === "new" ? "new" : "modified",
					...(existing.status === "new" ? {} : { originalContent }),
				};
			}
		}

		this.port.replace(next);
	}
}
