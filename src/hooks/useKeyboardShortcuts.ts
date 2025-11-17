import { useEffect } from "react";

export interface KeyboardShortcut {
	key: string;
	metaKey?: boolean;
	ctrlKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
	action: (event: KeyboardEvent) => void;
	description?: string;
	preventDefault?: boolean;
}

/**
 * Hook to register keyboard shortcuts
 */
export function useKeyboardShortcuts(
	shortcuts: KeyboardShortcut[],
	enabled = true,
) {
	useEffect(() => {
		if (!enabled) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			for (const shortcut of shortcuts) {
				const metaMatch =
					shortcut.metaKey === undefined || shortcut.metaKey === event.metaKey;
				const ctrlMatch =
					shortcut.ctrlKey === undefined || shortcut.ctrlKey === event.ctrlKey;
				const shiftMatch =
					shortcut.shiftKey === undefined ||
					shortcut.shiftKey === event.shiftKey;
				const altMatch =
					shortcut.altKey === undefined || shortcut.altKey === event.altKey;
				const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

				if (metaMatch && ctrlMatch && shiftMatch && altMatch && keyMatch) {
					if (shortcut.preventDefault !== false) {
						event.preventDefault();
					}
					shortcut.action(event);
					break;
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [shortcuts, enabled]);
}

/**
 * Format shortcut for display
 */
export function formatShortcut(
	shortcut: Omit<KeyboardShortcut, "action">,
): string {
	const parts: string[] = [];

	if (shortcut.metaKey) parts.push("⌘");
	if (shortcut.ctrlKey) parts.push("Ctrl");
	if (shortcut.shiftKey) parts.push("⇧");
	if (shortcut.altKey) parts.push("⌥");

	parts.push(shortcut.key.toUpperCase());

	return parts.join("");
}
