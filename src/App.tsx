import "./App.css";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useEffect, useRef, useState } from "react";
import {
	Save,
	FolderOpen,
	CheckCheck,
	MessageSquare,
	TerminalSquare,
	RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { PersistenceLoader } from "./components/PersistenceLoader";
import {
	CommandPalette,
	type CommandAction,
} from "./components/CommandPalette";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./components/ui/dialog";
import { ChatPane } from "./modules/chat/ChatPane";
import { useChatStore } from "./modules/chat/store";
import { EditorPane } from "./modules/editor";
import { FileTreePane } from "./modules/fs/FileTreePane";
import { PreviewPane } from "./modules/preview/PreviewPane";
import { useFs } from "./modules/fs/store";
import { useEditor } from "./modules/editor";
import {
	exportProjectAsJSON,
	exportProjectAsZip,
	importProjectFromJSON,
	importProjectFromZip,
	selectProjectFile,
} from "./modules/fs/export";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

import { Header } from "./components/Header";
import { useLayoutStore } from "./modules/layout/store";
import {
	TourProvider,
	TourAlertDialog,
	tourSteps,
	useTour,
} from "./modules/tour";

function AppContent() {
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [tourDialogOpen, setTourDialogOpen] = useState(true);
	const {
		filesByPath,
		saveToIndexedDB,
		acceptAllChanges,
		resetFs,
		setFiles,
		revertAllChanges,
		getModifiedFiles,
	} = useFs();
	const { closeAllFiles } = useEditor();
	const { clearMessages } = useChatStore();
	const { showChat, toggleChat, toggleConsole } = useLayoutStore();
	const { setSteps, startTour, setIsTourCompleted } = useTour();

	// Initialize tour steps
	useEffect(() => {
		setSteps(tourSteps);
	}, [setSteps]);

	// Dialog states
	const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
	const [revertAllDialogOpen, setRevertAllDialogOpen] = useState(false);
	const [exportDialogOpen, setExportDialogOpen] = useState(false);
	const [exportFormat, setExportFormat] = useState<"json" | "zip">("json");
	const [exportProjectName, setExportProjectName] = useState("my-project");
	const exportInputRef = useRef<HTMLInputElement>(null);

	const handleStartTour = () => {
		setIsTourCompleted(false);
		setTourDialogOpen(false);
		startTour();
	};

	// Define command actions
	const commandActions: CommandAction[] = [
		{
			id: "save",
			label: "Save Workspace",
			description: "Save all files to browser storage",
			icon: <Save className="h-4 w-4" />,
			action: async () => {
				const promise = saveToIndexedDB();
				toast.promise(promise, {
					loading: "Saving workspace...",
					success: "Workspace saved successfully!",
					error: "Failed to save workspace",
				});
				await promise;
			},
			shortcut: "⌘S",
			group: "File",
		},
		{
			id: "open-file",
			label: "Open File",
			description: "Quick open file by name",
			icon: <FolderOpen className="h-4 w-4" />,
			action: () => {
				// The command palette itself handles file opening
			},
			shortcut: "⌘P",
			group: "File",
		},
		{
			id: "accept-all",
			label: "Accept All Changes",
			description: "Accept all pending file changes",
			icon: <CheckCheck className="h-4 w-4" />,
			action: () => {
				acceptAllChanges();
				toast.success("All changes accepted");
			},
			shortcut: "⌘⇧A",
			group: "Edit",
		},
		{
			id: "toggle-chat",
			label: "Toggle Chat Panel",
			description: "Show or hide the chat panel",
			icon: <MessageSquare className="h-4 w-4" />,
			action: toggleChat,
			shortcut: "⌘1",
			group: "Layout",
		},
		{
			id: "toggle-console",
			label: "Toggle Console Panel",
			description: "Show or hide the console panel",
			icon: <TerminalSquare className="h-4 w-4" />,
			action: toggleConsole,
			shortcut: "⌘2",
			group: "Layout",
		},
		{
			id: "revert-all",
			label: "Revert All Changes",
			description: "Discard all pending file changes",
			icon: <RotateCcw className="h-4 w-4" />,
			action: () => {
				const modifiedFiles = getModifiedFiles();
				if (modifiedFiles.length === 0) {
					toast.info("No modified files to revert");
					return;
				}
				setRevertAllDialogOpen(true);
			},
			shortcut: "⌘⇧R",
			group: "Edit",
		},
	];

	// Project action handlers
	const handleNewProject = () => {
		setNewProjectDialogOpen(true);
	};

	const confirmNewProject = () => {
		resetFs();
		closeAllFiles();
		clearMessages();
		setNewProjectDialogOpen(false);
		toast.success("New project created", {
			description: "All files and storage cleared",
		});
	};

	const handleExportJSON = () => {
		setExportFormat("json");
		setExportProjectName("my-project");
		setExportDialogOpen(true);
	};

	const handleExportZip = () => {
		setExportFormat("zip");
		setExportProjectName("my-project");
		setExportDialogOpen(true);
	};

	const confirmExportProject = async () => {
		if (!exportProjectName.trim()) return;
		const name = exportProjectName.trim();
		setExportDialogOpen(false);

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
	};

	const handleImportJSON = async () => {
		try {
			const file = await selectProjectFile(".json");
			const importedFiles = await importProjectFromJSON(file);
			setFiles(importedFiles);
			closeAllFiles();
			const fileCount = Object.keys(importedFiles).length;
			toast.success("Project imported successfully", {
				description: `${fileCount} files loaded from JSON`,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to import project";
			if (message !== "File selection cancelled") {
				toast.error("Import failed", {
					description: message,
				});
			}
		}
	};

	const handleImportZip = async () => {
		try {
			const file = await selectProjectFile(".zip");
			const importedFiles = await importProjectFromZip(file);
			setFiles(importedFiles);
			closeAllFiles();
			const fileCount = Object.keys(importedFiles).length;
			toast.success("Project imported successfully", {
				description: `${fileCount} files loaded from ZIP`,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to import project";
			if (message !== "File selection cancelled") {
				toast.error("Import failed", {
					description: message,
				});
			}
		}
	};

	// Register keyboard shortcuts
	useKeyboardShortcuts([
		{
			key: "k",
			metaKey: true,
			action: () => setCommandPaletteOpen(true),
			description: "Open command palette",
		},
		{
			key: "p",
			metaKey: true,
			action: () => setCommandPaletteOpen(true),
			description: "Quick open file",
		},
		{
			key: "s",
			metaKey: true,
			action: async () => {
				const promise = saveToIndexedDB();
				toast.promise(promise, {
					loading: "Saving workspace...",
					success: "Workspace saved successfully!",
					error: "Failed to save workspace",
				});
				await promise;
			},
			description: "Save workspace",
		},
		{
			key: "1",
			metaKey: true,
			action: toggleChat,
			description: "Toggle chat panel",
		},
		{
			key: "2",
			metaKey: true,
			action: toggleConsole,
			description: "Toggle console panel",
		},
		{
			key: "a",
			metaKey: true,
			shiftKey: true,
			action: () => {
				acceptAllChanges();
				toast.success("All changes accepted");
			},
			description: "Accept all changes",
		},
		{
			key: "r",
			metaKey: true,
			shiftKey: true,
			action: () => {
				const modifiedFiles = getModifiedFiles();
				if (modifiedFiles.length === 0) {
					toast.info("No modified files to revert");
					return;
				}
				setRevertAllDialogOpen(true);
			},
			description: "Revert all changes",
		},
	]);

	return (
		<ErrorBoundary>
			<PersistenceLoader>
				<div className="w-screen h-screen bg-bg-primary text-fg-primary flex flex-col">
					<Header
						onOpenCommandPalette={() => setCommandPaletteOpen(true)}
						onNewProject={handleNewProject}
						onExportJSON={handleExportJSON}
						onExportZip={handleExportZip}
						onImportJSON={handleImportJSON}
						onImportZip={handleImportZip}
						onStartTour={handleStartTour}
					/>
					<div className="flex-1 overflow-hidden">
						<PanelGroup direction="horizontal" className="h-full">
							{showChat && (
								<>
									<Panel defaultSize={20} minSize={15} order={1}>
										<ChatPane />
									</Panel>
									<PanelResizeHandle className="w-px bg-border-primary" />
								</>
							)}
							<Panel defaultSize={15} minSize={10} order={2}>
								<FileTreePane />
							</Panel>
							<PanelResizeHandle className="w-px bg-border-primary" />
							<Panel defaultSize={35} minSize={20} order={3}>
								<EditorPane />
							</Panel>
							<PanelResizeHandle className="w-px bg-border-primary" />
							<Panel defaultSize={30} minSize={20} order={4}>
								<PreviewPane />
							</Panel>
						</PanelGroup>
					</div>

					<CommandPalette
						isOpen={commandPaletteOpen}
						onClose={() => setCommandPaletteOpen(false)}
						customActions={commandActions}
					/>
					<Toaster />

					{/* New Project Dialog */}
					<Dialog
						open={newProjectDialogOpen}
						onOpenChange={setNewProjectDialogOpen}
					>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Start New Project</DialogTitle>
								<DialogDescription>
									This will clear all current files and storage. This action
									cannot be undone.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<button
									type="button"
									onClick={() => setNewProjectDialogOpen(false)}
									className="px-4 py-2 text-sm rounded bg-bg-tertiary hover:bg-bg-secondary text-fg-secondary transition-colors"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={confirmNewProject}
									className="px-4 py-2 text-sm rounded bg-error hover:bg-error/90 text-white font-medium transition-colors"
								>
									Start New Project
								</button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Export Project Dialog */}
					<Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Export Project</DialogTitle>
								<DialogDescription>
									Enter a name for your project file.
								</DialogDescription>
							</DialogHeader>
							<div className="py-4">
								<input
									ref={exportInputRef}
									type="text"
									value={exportProjectName}
									onChange={(e) => setExportProjectName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											confirmExportProject();
										}
									}}
									placeholder="my-project"
									className="w-full px-3 py-2 text-sm bg-bg-tertiary border border-border-primary rounded focus:outline-none focus:ring-2 focus:ring-accent text-fg-primary placeholder:text-fg-muted"
									autoFocus
								/>
							</div>
							<DialogFooter>
								<button
									type="button"
									onClick={() => setExportDialogOpen(false)}
									className="px-4 py-2 text-sm rounded bg-bg-tertiary hover:bg-bg-secondary text-fg-secondary transition-colors"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={confirmExportProject}
									disabled={!exportProjectName.trim()}
									className="px-4 py-2 text-sm rounded bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
								>
									Export
								</button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Revert All Changes Dialog */}
					<Dialog
						open={revertAllDialogOpen}
						onOpenChange={setRevertAllDialogOpen}
					>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Revert All Changes</DialogTitle>
								<DialogDescription>
									This will discard changes in{" "}
									<span className="font-semibold text-fg-primary">
										{getModifiedFiles().length} file(s)
									</span>
									. This action cannot be undone.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<button
									type="button"
									onClick={() => setRevertAllDialogOpen(false)}
									className="px-4 py-2 text-sm rounded bg-bg-tertiary hover:bg-bg-secondary text-fg-secondary transition-colors"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={() => {
										const count = getModifiedFiles().length;
										revertAllChanges();
										setRevertAllDialogOpen(false);
										toast.success(`Reverted ${count} file(s)`);
									}}
									className="px-4 py-2 text-sm rounded bg-warning hover:bg-warning/90 text-white font-medium transition-colors"
								>
									Revert All
								</button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>

				{/* Tour Welcome Dialog */}
				<TourAlertDialog
					isOpen={tourDialogOpen}
					setIsOpen={setTourDialogOpen}
				/>
			</PersistenceLoader>
		</ErrorBoundary>
	);
}

export default function App() {
	return (
		<TourProvider>
			<AppContent />
		</TourProvider>
	);
}
