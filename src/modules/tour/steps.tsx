import {
	Code,
	Command,
	Eye,
	FolderTree,
	MessageSquare,
	Terminal,
} from "lucide-react";
import { TOUR_STEP_IDS } from "@/modules/tour/constants";
import type { TourStep } from "@/modules/tour/Tour";

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
					Ask the coding agent for a feature, refactor, or bug fix. It works in
					an isolated copy and returns file and hunk changes for your approval.
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
					View and edit your code here. Accepted agent changes remain visible as
					local modifications until you mark them clean or undo them.
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
