import type { VirtualFile } from "./types";

/**
 * Project export format
 */
export interface ProjectExport {
	version: string;
	name: string;
	timestamp: number;
	files: Record<string, VirtualFile>;
}

/**
 * Export project as JSON
 */
export function exportProjectAsJSON(
	filesByPath: Record<string, VirtualFile>,
	projectName = "mini-lovable-project",
): void {
	const exportData: ProjectExport = {
		version: "1.0.0",
		name: projectName,
		timestamp: Date.now(),
		files: filesByPath,
	};

	const jsonString = JSON.stringify(exportData, null, 2);
	const blob = new Blob([jsonString], { type: "application/json" });
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	link.download = `${projectName}-${Date.now()}.json`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Import project from JSON file
 */
export function importProjectFromJSON(
	file: File,
): Promise<Record<string, VirtualFile>> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const content = event.target?.result as string;
				const data = JSON.parse(content) as ProjectExport;

				// Validate the import data
				if (!data.files || typeof data.files !== "object") {
					throw new Error("Invalid project file: missing or invalid files");
				}

				// Validate each file has required properties
				for (const [path, file] of Object.entries(data.files)) {
					if (!file.path || !file.content || !file.status) {
						throw new Error(`Invalid file data for ${path}`);
					}
				}

				resolve(data.files);
			} catch (error) {
				reject(
					error instanceof Error
						? error
						: new Error("Failed to parse project file"),
				);
			}
		};

		reader.onerror = () => {
			reject(new Error("Failed to read file"));
		};

		reader.readAsText(file);
	});
}

/**
 * Trigger file input to select a project file
 */
export function selectProjectFile(): Promise<File> {
	return new Promise((resolve, reject) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";

		input.onchange = (event) => {
			const file = (event.target as HTMLInputElement).files?.[0];
			if (file) {
				resolve(file);
			} else {
				reject(new Error("No file selected"));
			}
		};

		input.oncancel = () => {
			reject(new Error("File selection cancelled"));
		};

		input.click();
	});
}
