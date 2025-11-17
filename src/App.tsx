import "./App.css";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useState } from "react";
import { Save, FolderOpen, CheckCheck } from "lucide-react";
import { PersistenceLoader } from "./components/PersistenceLoader";
import {
	CommandPalette,
	type CommandAction,
} from "./components/CommandPalette";
import { ChatPane } from "./modules/chat/ChatPane";
import { FileTreePane } from "./modules/fs/FileTreePane";
import { PreviewPane } from "./modules/preview/PreviewPane";
import { useFs } from "./modules/fs/store";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

export default function App() {
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const { saveToIndexedDB, acceptAllChanges } = useFs();

	// Define command actions
	const commandActions: CommandAction[] = [
		{
			id: "save",
			label: "Save Workspace",
			description: "Save all files to browser storage",
			icon: <Save className="h-4 w-4" />,
			action: async () => {
				await saveToIndexedDB();
				// Could add a toast notification here
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
				await saveToIndexedDB();
			},
			description: "Save workspace",
		},
	]);

	return (
		<PersistenceLoader>
			<div className="w-screen h-screen bg-neutral-950 text-neutral-100">
				<PanelGroup direction="horizontal" className="h-full">
					<Panel defaultSize={18} minSize={10}>
						<ChatPane />
					</Panel>
					<PanelResizeHandle className="w-px bg-neutral-800/80" />
					<Panel defaultSize={24} minSize={15}>
						<FileTreePane />
					</Panel>
					<PanelResizeHandle className="w-px bg-neutral-800/80" />
					<Panel defaultSize={58} minSize={25}>
						<PreviewPane />
					</Panel>
				</PanelGroup>

				<CommandPalette
					isOpen={commandPaletteOpen}
					onClose={() => setCommandPaletteOpen(false)}
					customActions={commandActions}
				/>
			</div>
		</PersistenceLoader>
	);
}
