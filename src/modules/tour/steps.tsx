import {
	Code,
	Command,
	Eye,
	FolderTree,
	MessageSquare,
	MoreHorizontal,
} from "lucide-react";
import type { WorkbenchView } from "@/modules/layout/store";
import { TOUR_STEP_IDS } from "@/modules/tour/constants";
import type { TourStep } from "@/modules/tour/Tour";

const chatStep: TourStep = {
	selectorId: TOUR_STEP_IDS.CHAT_PANE,
	position: "right",
	content: (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<MessageSquare className="h-5 w-5 text-accent" />
				<h3 className="font-semibold text-fg-primary">Chat Pane</h3>
			</div>
			<p className="text-sm text-fg-secondary leading-relaxed">
				Ask the coding agent for a feature, refactor, or bug fix. It works in an
				isolated copy and returns file and hunk changes for your approval.
			</p>
		</div>
	),
};

const viewTabsStep: TourStep = {
	selectorId: TOUR_STEP_IDS.VIEW_TABS,
	position: "bottom",
	content: (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<Code className="h-5 w-5 text-accent" />
				<h3 className="font-semibold text-fg-primary">Code &amp; Preview</h3>
			</div>
			<p className="text-sm text-fg-secondary leading-relaxed">
				Switch between editing your source files and the live running app. The
				preview keeps running in the background, so switching is instant.
			</p>
		</div>
	),
};

const codeWorkspaceStep: TourStep = {
	selectorId: TOUR_STEP_IDS.CODE_WORKSPACE,
	position: "bottom",
	content: (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<FolderTree className="h-5 w-5 text-accent" />
				<h3 className="font-semibold text-fg-primary">Code Workspace</h3>
			</div>
			<p className="text-sm text-fg-secondary leading-relaxed">
				Browse and manage files on the left — right-click for rename and delete.
				Edit code on the right. Accepted agent changes remain visible as local
				modifications until you mark them clean or undo them.
			</p>
		</div>
	),
};

const previewWorkspaceStep: TourStep = {
	selectorId: TOUR_STEP_IDS.PREVIEW_WORKSPACE,
	position: "left",
	content: (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<Eye className="h-5 w-5 text-accent" />
				<h3 className="font-semibold text-fg-primary">Live Preview</h3>
			</div>
			<p className="text-sm text-fg-secondary leading-relaxed">
				See the running app update as your files change. Use the preview toolbar
				to refresh or enter fullscreen; when agent changes are ready, switch
				between the current app and its draft before accepting them.
			</p>
		</div>
	),
};

const moreMenuStep: TourStep = {
	selectorId: TOUR_STEP_IDS.MORE_MENU,
	position: "bottom",
	content: (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<MoreHorizontal className="h-5 w-5 text-accent" />
				<h3 className="font-semibold text-fg-primary">More Actions</h3>
			</div>
			<p className="text-sm text-fg-secondary leading-relaxed">
				Project actions live here: start a new project, import or export it,
				toggle the console (
				<kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary text-xs">⌘2</kbd>
				), and replay this tour.
			</p>
		</div>
	),
};

const commandPaletteStep: TourStep = {
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
};

export function getTourSteps(view: WorkbenchView): TourStep[] {
	return [
		chatStep,
		viewTabsStep,
		view === "code" ? codeWorkspaceStep : previewWorkspaceStep,
		moreMenuStep,
		commandPaletteStep,
	];
}
