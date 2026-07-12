import { useFs } from "@/modules/fs/store";
import type { VirtualFile } from "@/modules/fs/types";
import {
	normalizeWorkspaceFiles,
	normalizeWorkspacePath,
} from "@/modules/workspace/domain";
import type { WorkspaceFiles } from "@/modules/workspace/types";
import { VirtualFileWorkspaceRepository } from "@/modules/workspace/virtual-file-repository";
import { WorkspaceService } from "@/modules/workspace/workspace";

const repository = new VirtualFileWorkspaceRepository({
	read: () => useFs.getState().filesByPath,
	replace: (files) => useFs.getState().setFiles(files),
});

class BrowserWorkspace extends WorkspaceService {
	updateFileContent(path: string, content: string): Promise<void> {
		return this.enqueueMutation(() => {
			const normalizedPath = normalizeWorkspacePath(path);
			useFs.getState().updateFileContent(normalizedPath, content);
		});
	}

	createFile(path: string, content = ""): Promise<void> {
		return this.enqueueMutation(() => {
			const normalizedPath = normalizeWorkspacePath(path);
			useFs.getState().createFile(normalizedPath, content);
		});
	}

	deleteFile(path: string): Promise<void> {
		return this.enqueueMutation(() => {
			const normalizedPath = normalizeWorkspacePath(path);
			useFs.getState().deleteFile(normalizedPath);
		});
	}

	renameFile(oldPath: string, newPath: string): Promise<void> {
		return this.enqueueMutation(() => {
			const normalizedOldPath = normalizeWorkspacePath(oldPath);
			const normalizedNewPath = normalizeWorkspacePath(newPath);
			useFs.getState().renameFile(normalizedOldPath, normalizedNewPath);
		});
	}

	deleteDirectory(path: string): Promise<void> {
		return this.enqueueMutation(() => {
			const normalizedPath = normalizeWorkspacePath(path);
			useFs.getState().deleteDirectory(normalizedPath);
		});
	}

	renameDirectory(oldPath: string, newPath: string): Promise<void> {
		return this.enqueueMutation(() => {
			const normalizedOldPath = normalizeWorkspacePath(oldPath);
			const normalizedNewPath = normalizeWorkspacePath(newPath);
			useFs.getState().renameDirectory(normalizedOldPath, normalizedNewPath);
		});
	}

	replaceFiles(files: Record<string, VirtualFile>): Promise<void> {
		const sourcesByPath = new Map(
			Object.entries(files).map(([path, file]) => [
				normalizeWorkspacePath(path),
				file,
			]),
		);
		const normalizedContents = normalizeWorkspaceFiles(
			Object.fromEntries(
				Object.entries(files).map(([path, file]) => [path, file.content]),
			),
		);
		const normalizedFiles = Object.fromEntries(
			Object.entries(normalizedContents).map(([path, content]) => {
				const source = sourcesByPath.get(path);
				return [
					path,
					{
						path,
						content,
						status: source?.status ?? "clean",
						...(source?.originalContent === undefined
							? {}
							: { originalContent: source.originalContent }),
					},
				];
			}),
		) satisfies Record<string, VirtualFile>;
		return this.enqueueMutation(() => {
			useFs.getState().setFiles(normalizedFiles);
		});
	}

	reset(): Promise<void> {
		return this.enqueueMutation(() => useFs.getState().resetFs());
	}

	load(): Promise<boolean> {
		return this.enqueueMutation(() => useFs.getState().loadFromPersistence());
	}

	save(): Promise<void> {
		return this.enqueueMutation(() => useFs.getState().saveToIndexedDB());
	}

	acceptAllChanges(): Promise<void> {
		return this.enqueueMutation(() => {
			useFs.getState().acceptAllChanges();
		});
	}

	revertFile(path: string): Promise<void> {
		const normalizedPath = normalizeWorkspacePath(path);
		return this.enqueueMutation(() => {
			useFs.getState().revertFile(normalizedPath);
		});
	}

	revertAllChanges(): Promise<void> {
		return this.enqueueMutation(() => {
			useFs.getState().revertAllChanges();
		});
	}

	async readVirtualFiles(): Promise<Record<string, VirtualFile>> {
		await this.waitForMutations();
		return useFs.getState().filesByPath;
	}

	async modifiedFilePaths(): Promise<string[]> {
		await this.waitForMutations();
		return useFs.getState().getModifiedFiles();
	}
}

export const browserWorkspace = new BrowserWorkspace(repository);

export function useBrowserWorkspaceFiles(): Record<string, VirtualFile> {
	return useFs((state) => state.filesByPath);
}

export function readBrowserVirtualFiles(): Record<string, VirtualFile> {
	return useFs.getState().filesByPath;
}

export function readBrowserWorkspaceFiles(): WorkspaceFiles {
	return Object.fromEntries(
		Object.entries(readBrowserVirtualFiles()).map(([path, file]) => [
			path,
			file.content,
		]),
	);
}
