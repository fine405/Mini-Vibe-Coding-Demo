import "./App.css";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useState } from "react";
import { Save, FolderOpen, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { PersistenceLoader } from "./components/PersistenceLoader";
import {
	CommandPalette,
	type CommandAction,
} from "./components/CommandPalette";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import { ChatPane } from "./modules/chat/ChatPane";
import { EditorPane } from "./modules/editor";
import { FileTreePane } from "./modules/fs/FileTreePane";
import { PreviewPane } from "./modules/preview/PreviewPane";
import { useFs } from "./modules/fs/store";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

import { Header } from "./components/Header";
import { useLayoutStore } from "./modules/layout/store";

export default function App() {
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const { saveToIndexedDB, acceptAllChanges } = useFs();
	const { showChat } = useLayoutStore();

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
	];

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
	]);

	return (
		<ErrorBoundary>
			<PersistenceLoader>
				<div className="w-screen h-screen bg-neutral-950 text-neutral-100 flex flex-col">
					<Header />
					<div className="flex-1 overflow-hidden">
						<PanelGroup direction="horizontal" className="h-full">
							{showChat && (
								<>
									<Panel defaultSize={20} minSize={15} order={1}>
										<ChatPane />
									</Panel>
									<PanelResizeHandle className="w-px bg-neutral-800/80" />
								</>
							)}
							<Panel defaultSize={15} minSize={10} order={2}>
								<FileTreePane />
							</Panel>
							<PanelResizeHandle className="w-px bg-neutral-800/80" />
							<Panel defaultSize={35} minSize={20} order={3}>
								<EditorPane />
							</Panel>
							<PanelResizeHandle className="w-px bg-neutral-800/80" />
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
				</div>
			</PersistenceLoader>
		</ErrorBoundary>
	);
}
