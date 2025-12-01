import {
	Code,
	Command,
	Eye,
	FolderTree,
	MessageSquare,
	Terminal,
} from "lucide-react";
import { TOUR_STEP_IDS } from "./constants";
import type { TourStep } from "./Tour";

export const tourSteps: TourStep[] = [
	{
		selectorId: TOUR_STEP_IDS.CHAT_PANE,
		position: "right",
		content: (
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<MessageSquare className="h-5 w-5 text-accent" />
					<h3 className="font-semibold text-fg-primary">Chat Pane</h3>
				</div>
				<p className="text-sm text-fg-secondary leading-relaxed">
					Send messages here to trigger AI code patches. Try typing "add
					filters" or "add localstorage" to see the AI apply changes to your
					code.
				</p>
			</div>
		),
	},
	{
		selectorId: TOUR_STEP_IDS.FILE_TREE,
		position: "right",
		content: (
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<FolderTree className="h-5 w-5 text-accent" />
					<h3 className="font-semibold text-fg-primary">File Tree</h3>
				</div>
				<p className="text-sm text-fg-secondary leading-relaxed">
					Browse and manage your project files. Right-click for options like
					rename and delete. Double-click to open files in the editor.
				</p>
			</div>
		),
	},
	{
		selectorId: TOUR_STEP_IDS.EDITOR,
		position: "bottom",
		content: (
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Code className="h-5 w-5 text-accent" />
					<h3 className="font-semibold text-fg-primary">Code Editor</h3>
				</div>
				<p className="text-sm text-fg-secondary leading-relaxed">
					View and edit your code here. When AI patches are applied, you'll see
					a diff view showing the changes before accepting them.
				</p>
			</div>
		),
	},
	{
		selectorId: TOUR_STEP_IDS.PREVIEW,
		position: "left",
		content: (
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Eye className="h-5 w-5 text-accent" />
					<h3 className="font-semibold text-fg-primary">Live Preview</h3>
				</div>
				<p className="text-sm text-fg-secondary leading-relaxed">
					See your app running in real-time. Changes are reflected instantly as
					you edit code or accept AI patches.
				</p>
			</div>
		),
	},
	{
		selectorId: TOUR_STEP_IDS.CONSOLE,
		position: "left",
		content: (
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Terminal className="h-5 w-5 text-accent" />
					<h3 className="font-semibold text-fg-primary">Console</h3>
				</div>
				<p className="text-sm text-fg-secondary leading-relaxed">
					View console logs and errors from your running app. Toggle visibility
					with{" "}
					<kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary text-xs">⌘2</kbd>
					.
				</p>
			</div>
		),
	},
	{
		selectorId: TOUR_STEP_IDS.COMMAND_PALETTE,
		position: "bottom",
		content: (
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Command className="h-5 w-5 text-accent" />
					<h3 className="font-semibold text-fg-primary">Command Palette</h3>
				</div>
				<p className="text-sm text-fg-secondary leading-relaxed">
					Quick access to all commands. Press{" "}
					<kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary text-xs">⌘K</kbd>{" "}
					to open and search for files or actions.
				</p>
			</div>
		),
	},
];
