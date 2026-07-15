import { useState } from "react";
import { toast } from "sonner";
import { useAgentChangeSessionStore } from "@/modules/agent-chat/change-session";
import { useAgentChatSessionStore } from "@/modules/agent-chat/session-store";
import { useEditor } from "@/modules/editor/store";
import {
	exportProjectAsJSON,
	exportProjectAsZip,
	importProjectFromJSON,
	importProjectFromZip,
	selectProjectFile,
} from "@/modules/fs/export";
import { browserWorkspace } from "@/modules/workspace/browser";

type ExportFormat = "json" | "zip";

export interface ProjectController {
	newProjectDialogOpen: boolean;
	setNewProjectDialogOpen(open: boolean): void;
	exportDialogOpen: boolean;
	setExportDialogOpen(open: boolean): void;
	exportFormat: ExportFormat;
	exportProjectName: string;
	setExportProjectName(name: string): void;
	revertAllDialogOpen: boolean;
	setRevertAllDialogOpen(open: boolean): void;
	modifiedFileCount: number;
	requestNewProject(): void;
	confirmNewProject(): void;
	requestExport(format: ExportFormat): void;
	confirmExportProject(): Promise<void>;
	importJson(): Promise<void>;
	importZip(): Promise<void>;
	requestRevertAll(): void;
	confirmRevertAll(): void;
}

export function useProjectController(): ProjectController {
	const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
	const [revertAllDialogOpen, setRevertAllDialogOpen] = useState(false);
	const [exportDialogOpen, setExportDialogOpen] = useState(false);
	const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
	const [exportProjectName, setExportProjectName] = useState("my-project");
	const [modifiedFileCount, setModifiedFileCount] = useState(0);
	const closeAllFiles = useEditor((state) => state.closeAllFiles);
	const resetChatSession = useAgentChatSessionStore(
		(state) => state.resetSession,
	);

	const confirmNewProject = () => {
		const agentSession = useAgentChangeSessionStore.getState();
		if (agentSession.phase !== "idle") agentSession.requestDiscardAll();
		void browserWorkspace
			.reset()
			.then(() => {
				useAgentChangeSessionStore.getState().clear();
				closeAllFiles();
				resetChatSession();
				setNewProjectDialogOpen(false);
				toast.success("New project created", {
					description: "All files and storage cleared",
				});
			})
			.catch((error: unknown) => {
				toast.error("Could not reset project", {
					description: errorMessage(error),
				});
			});
	};

	const requestExport = (format: ExportFormat) => {
		setExportFormat(format);
		setExportProjectName("my-project");
		setExportDialogOpen(true);
	};

	const confirmExportProject = async () => {
		const name = exportProjectName.trim();
		if (!name) return;
		setExportDialogOpen(false);
		try {
			const filesByPath = await browserWorkspace.readVirtualFiles();
			if (exportFormat === "zip") {
				await exportProjectAsZip(filesByPath, name);
				toast.success("Project exported", {
					description: `${name}.zip downloaded`,
				});
			} else {
				exportProjectAsJSON(filesByPath, name);
				toast.success("Project exported", {
					description: `${name}.json downloaded`,
				});
			}
		} catch (error) {
			toast.error("Export failed", { description: errorMessage(error) });
		}
	};

	const importProject = async (format: "json" | "zip") => {
		try {
			const file = await selectProjectFile(
				format === "json" ? ".json" : ".zip",
			);
			const importedFiles =
				format === "json"
					? await importProjectFromJSON(file)
					: await importProjectFromZip(file);
			await browserWorkspace.replaceFiles(importedFiles);
			closeAllFiles();
			toast.success("Project imported successfully", {
				description: `${Object.keys(importedFiles).length} files loaded from ${format.toUpperCase()}`,
			});
		} catch (error) {
			const message = errorMessage(error);
			if (message !== "File selection cancelled") {
				toast.error("Import failed", { description: message });
			}
		}
	};

	const requestRevertAll = () => {
		void browserWorkspace.modifiedFilePaths().then((paths) => {
			if (paths.length === 0) {
				toast.info("No modified files to revert");
				return;
			}
			setModifiedFileCount(paths.length);
			setRevertAllDialogOpen(true);
		});
	};

	const confirmRevertAll = () => {
		void browserWorkspace.modifiedFilePaths().then(async (paths) => {
			await browserWorkspace.revertAllChanges();
			setModifiedFileCount(0);
			setRevertAllDialogOpen(false);
			toast.success(`Reverted ${paths.length} file(s)`);
		});
	};

	return {
		newProjectDialogOpen,
		setNewProjectDialogOpen,
		exportDialogOpen,
		setExportDialogOpen,
		exportFormat,
		exportProjectName,
		setExportProjectName,
		revertAllDialogOpen,
		setRevertAllDialogOpen,
		modifiedFileCount,
		requestNewProject: () => setNewProjectDialogOpen(true),
		confirmNewProject,
		requestExport,
		confirmExportProject,
		importJson: () => importProject("json"),
		importZip: () => importProject("zip"),
		requestRevertAll,
		confirmRevertAll,
	};
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Unexpected project error";
}
