import {
	CheckCheck,
	FolderOpen,
	MessageSquare,
	RotateCcw,
	Save,
	TerminalSquare,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { CommandAction } from "@/components/CommandPalette";
import {
	type KeyboardShortcut,
	useKeyboardShortcuts,
} from "@/hooks/useKeyboardShortcuts";
import { useLayoutStore } from "@/modules/layout/store";
import { browserWorkspace } from "@/modules/workspace/browser";

interface CommandRegistryOptions {
	openCommandPalette(): void;
	requestRevertAll(): void;
}

export function useCommandRegistry({
	openCommandPalette,
	requestRevertAll,
}: CommandRegistryOptions): CommandAction[] {
	const { toggleChat, toggleConsole } = useLayoutStore();
	const saveWorkspace = useCallback(async () => {
		const promise = browserWorkspace.save();
		toast.promise(promise, {
			loading: "Saving workspace...",
			success: "Workspace saved successfully!",
			error: "Failed to save workspace",
		});
		await promise;
	}, []);
	const acceptChanges = useCallback(() => {
		void browserWorkspace.acceptAllChanges().then(() => {
			toast.success("All changes accepted");
		});
	}, []);

	const actions = useMemo<CommandAction[]>(
		() => [
			{
				id: "save",
				label: "Save Workspace",
				description: "Save all files to browser storage",
				icon: <Save className="size-4" />,
				action: () => void saveWorkspace(),
				shortcut: "⌘S",
				group: "File",
			},
			{
				id: "open-file",
				label: "Open File",
				description: "Quick open file by name",
				icon: <FolderOpen className="size-4" />,
				action: openCommandPalette,
				shortcut: "⌘P",
				group: "File",
			},
			{
				id: "accept-all",
				label: "Accept All Changes",
				description: "Accept all pending file changes",
				icon: <CheckCheck className="size-4" />,
				action: acceptChanges,
				shortcut: "⌘⇧A",
				group: "Edit",
			},
			{
				id: "toggle-chat",
				label: "Toggle Chat Panel",
				description: "Show or hide the chat panel",
				icon: <MessageSquare className="size-4" />,
				action: toggleChat,
				shortcut: "⌘1",
				group: "Layout",
			},
			{
				id: "toggle-console",
				label: "Toggle Console Panel",
				description: "Show or hide the console panel",
				icon: <TerminalSquare className="size-4" />,
				action: toggleConsole,
				shortcut: "⌘2",
				group: "Layout",
			},
			{
				id: "revert-all",
				label: "Revert All Changes",
				description: "Discard all pending file changes",
				icon: <RotateCcw className="size-4" />,
				action: requestRevertAll,
				shortcut: "⌘⇧R",
				group: "Edit",
			},
		],
		[
			acceptChanges,
			openCommandPalette,
			requestRevertAll,
			saveWorkspace,
			toggleChat,
			toggleConsole,
		],
	);
	const shortcuts = useMemo<KeyboardShortcut[]>(
		() => [
			{ key: "k", metaKey: true, action: openCommandPalette },
			{ key: "p", metaKey: true, action: openCommandPalette },
			{ key: "s", metaKey: true, action: () => void saveWorkspace() },
			{ key: "1", metaKey: true, action: toggleChat },
			{ key: "2", metaKey: true, action: toggleConsole },
			{ key: "a", metaKey: true, shiftKey: true, action: acceptChanges },
			{
				key: "r",
				metaKey: true,
				shiftKey: true,
				action: requestRevertAll,
			},
		],
		[
			acceptChanges,
			openCommandPalette,
			requestRevertAll,
			saveWorkspace,
			toggleChat,
			toggleConsole,
		],
	);
	useKeyboardShortcuts(shortcuts);

	return actions;
}
