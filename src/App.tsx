import "./App.css";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useRef, useState } from "react";
import {
	Save,
	FolderOpen,
	CheckCheck,
	MessageSquare,
	TerminalSquare,
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
import { EditorPane } from "./modules/editor";
import { FileTreePane } from "./modules/fs/FileTreePane";
import { PreviewPane } from "./modules/preview/PreviewPane";
import { useFs } from "./modules/fs/store";
import { useEditor } from "./modules/editor";
import {
	exportProjectAsJSON,
	importProjectFromJSON,
	selectProjectFile,
} from "./modules/fs/export";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

import { Header } from "./components/Header";
import { useLayoutStore } from "./modules/layout/store";

export default function App() {
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const { filesByPath, saveToIndexedDB, acceptAllChanges, resetFs, setFiles } =
		useFs();
	const { closeAllFiles } = useEditor();
	const { showChat, toggleChat, toggleConsole } = useLayoutStore();

	// Dialog states
	const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
	const [exportDialogOpen, setExportDialogOpen] = useState(false);
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [exportProjectName, setExportProjectName] = useState("my-project");
	const exportInputRef = useRef<HTMLInputElement>(null);

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
	];

	// Project action handlers
	const handleNewProject = () => {
		setNewProjectDialogOpen(true);
	};

	const confirmNewProject = () => {
		resetFs();
		closeAllFiles();
		setNewProjectDialogOpen(false);
		toast.success("New project created", {
			description: "All files and storage cleared",
		});
	};

	const handleExportProject = () => {
		setExportProjectName("my-project");
		setExportDialogOpen(true);
	};

	const confirmExportProject = () => {
		if (!exportProjectName.trim()) return;
		exportProjectAsJSON(filesByPath, exportProjectName.trim());
		setExportDialogOpen(false);
		toast.success("Project exported", {
			description: `${exportProjectName.trim()}.json downloaded`,
		});
	};

	const handleImportProject = () => {
		setImportDialogOpen(true);
	};

	const confirmImportProject = async () => {
		setImportDialogOpen(false);
		try {
			const file = await selectProjectFile();
			const importedFiles = await importProjectFromJSON(file);
			setFiles(importedFiles);
			closeAllFiles();
			const fileCount = Object.keys(importedFiles).length;
			toast.success("Project imported successfully", {
				description: `${fileCount} files loaded and saved to storage`,
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
	]);

	return (
		<ErrorBoundary>
			<PersistenceLoader>
				<div className="w-screen h-screen bg-bg-primary text-fg-primary flex flex-col">
					<Header
						onOpenCommandPalette={() => setCommandPaletteOpen(true)}
						onNewProject={handleNewProject}
						onExportProject={handleExportProject}
						onImportProject={handleImportProject}
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

					{/* Import Project Dialog */}
					<Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Import Project</DialogTitle>
								<DialogDescription>
									This will replace all current files with the imported project.
									This action cannot be undone.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<button
									type="button"
									onClick={() => setImportDialogOpen(false)}
									className="px-4 py-2 text-sm rounded bg-bg-tertiary hover:bg-bg-secondary text-fg-secondary transition-colors"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={confirmImportProject}
									className="px-4 py-2 text-sm rounded bg-accent hover:bg-accent-hover text-white font-medium transition-colors"
								>
									Choose File & Import
								</button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</PersistenceLoader>
		</ErrorBoundary>
	);
}
