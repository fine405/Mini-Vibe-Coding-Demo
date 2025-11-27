import JSZip from "jszip";
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
export function selectProjectFile(
	accept: ".json" | ".zip" = ".json",
): Promise<File> {
	return new Promise((resolve, reject) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = accept;

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

/**
 * Export project as ZIP
 */
export async function exportProjectAsZip(
	filesByPath: Record<string, VirtualFile>,
	projectName = "mini-lovable-project",
): Promise<void> {
	const zip = new JSZip();

	// Add each file to the ZIP, preserving directory structure
	for (const [path, file] of Object.entries(filesByPath)) {
		// Remove leading slash for ZIP path
		const zipPath = path.startsWith("/") ? path.slice(1) : path;
		zip.file(zipPath, file.content);
	}

	// Generate the ZIP blob
	const blob = await zip.generateAsync({ type: "blob" });
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	link.download = `${projectName}-${Date.now()}.zip`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Import project from ZIP file
 */
export async function importProjectFromZip(
	file: File,
): Promise<Record<string, VirtualFile>> {
	const zip = await JSZip.loadAsync(file);
	const files: Record<string, VirtualFile> = {};

	const filePromises: Promise<void>[] = [];

	zip.forEach((relativePath, zipEntry) => {
		// Skip directories
		if (zipEntry.dir) return;

		const promise = zipEntry.async("string").then((content) => {
			// Ensure path starts with /
			const path = relativePath.startsWith("/")
				? relativePath
				: `/${relativePath}`;
			files[path] = {
				path,
				content,
				status: "clean",
			};
		});
		filePromises.push(promise);
	});

	await Promise.all(filePromises);

	if (Object.keys(files).length === 0) {
		throw new Error("ZIP file contains no valid files");
	}

	return files;
}
