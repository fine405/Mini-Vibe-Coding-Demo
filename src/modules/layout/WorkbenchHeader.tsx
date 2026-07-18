import { clsx } from "clsx";
import { motion } from "framer-motion";
import {
	Check,
	Code,
	Command,
	Download,
	Eye,
	FileArchive,
	FileJson,
	FilePlus2,
	HelpCircle,
	MoreHorizontal,
	PanelLeft,
	TerminalSquare,
	Upload,
} from "lucide-react";
import { ThemeMenu } from "@/components/ThemeMenu";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLayoutStore, type WorkbenchView } from "@/modules/layout/store";

interface WorkbenchHeaderProps {
	onOpenCommandPalette?: () => void;
	onNewProject?: () => void;
	onExportJSON?: () => void;
	onExportZip?: () => void;
	onImportJSON?: () => void;
	onImportZip?: () => void;
	onStartTour?: () => void;
}

const VIEW_TABS: Array<{
	id: WorkbenchView;
	label: string;
	icon: typeof Code;
}> = [
	{ id: "code", label: "Code", icon: Code },
	{ id: "preview", label: "Preview", icon: Eye },
];

function ViewTabs() {
	const { activeView, setActiveView } = useLayoutStore();

	return (
		<div
			aria-label="Workbench view"
			className="flex items-center gap-0.5 rounded-full border border-border-primary bg-bg-secondary p-0.5"
			id="tour-view-tabs"
			role="tablist"
		>
			{VIEW_TABS.map((tab) => {
				const active = activeView === tab.id;
				return (
					<button
						aria-selected={active}
						className={clsx(
							"relative flex h-6 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
							active
								? "text-fg-primary"
								: "text-fg-muted hover:text-fg-secondary",
						)}
						key={tab.id}
						onClick={() => setActiveView(tab.id)}
						role="tab"
						type="button"
					>
						{active && (
							<motion.span
								className="absolute inset-0 rounded-full bg-bg-primary shadow-sm ring-1 ring-border-primary"
								layoutId="workbench-view-tab-pill"
								transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
							/>
						)}
						<tab.icon className="relative z-10 h-3.5 w-3.5" />
						<span className="relative z-10">{tab.label}</span>
					</button>
				);
			})}
		</div>
	);
}

export function WorkbenchHeader({
	onOpenCommandPalette,
	onNewProject,
	onExportJSON,
	onExportZip,
	onImportJSON,
	onImportZip,
	onStartTour,
}: WorkbenchHeaderProps) {
	const { showChat, showConsole, setChatVisible, toggleConsole } =
		useLayoutStore();

	return (
		<header className="flex h-10 w-full shrink-0 items-center gap-2 border-b border-border-primary bg-bg-primary px-3 text-fg-primary">
			<TooltipProvider delayDuration={300}>
				{!showChat && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								aria-label="Show chat panel"
								className="text-fg-muted hover:bg-bg-tertiary hover:text-fg-primary"
								onClick={() => setChatVisible(true)}
								size="icon-sm"
								variant="ghost"
							>
								<PanelLeft className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Show Chat (⌘1)</TooltipContent>
					</Tooltip>
				)}

				<ViewTabs />

				<div className="ml-auto flex items-center gap-1">
					<Button
						aria-label="Open command palette"
						className="h-7 gap-2 border-border-primary bg-bg-secondary px-2.5 text-fg-secondary hover:bg-bg-tertiary hover:text-fg-primary"
						id="tour-command-palette"
						onClick={onOpenCommandPalette}
						size="sm"
						variant="outline"
					>
						<Command className="h-3.5 w-3.5 text-fg-muted" />
						<span className="text-xs font-medium tracking-wide">
							Command Palette
						</span>
						<kbd className="text-[10px] leading-none text-fg-muted">⌘K</kbd>
					</Button>

					<ThemeMenu />

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								aria-label="More actions"
								className="text-fg-muted hover:bg-bg-tertiary hover:text-fg-primary data-open:bg-bg-tertiary data-open:text-fg-primary"
								id="tour-more-menu"
								size="icon-sm"
								variant="ghost"
							>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-52">
							<DropdownMenuItem onClick={onNewProject}>
								<FilePlus2 className="h-4 w-4" />
								<span>New Project</span>
							</DropdownMenuItem>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>
									<Upload className="h-4 w-4" />
									<span>Import</span>
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent className="w-44">
									<DropdownMenuItem onClick={onImportJSON}>
										<FileJson className="h-4 w-4" />
										<span>Import JSON</span>
									</DropdownMenuItem>
									<DropdownMenuItem onClick={onImportZip}>
										<FileArchive className="h-4 w-4" />
										<span>Import ZIP</span>
									</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>
									<Download className="h-4 w-4" />
									<span>Export</span>
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent className="w-44">
									<DropdownMenuItem onClick={onExportJSON}>
										<FileJson className="h-4 w-4" />
										<span>Export as JSON</span>
									</DropdownMenuItem>
									<DropdownMenuItem onClick={onExportZip}>
										<FileArchive className="h-4 w-4" />
										<span>Export as ZIP</span>
									</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={toggleConsole}>
								<TerminalSquare className="h-4 w-4" />
								<span>Console</span>
								<DropdownMenuShortcut className="flex items-center gap-1.5">
									{showConsole && (
										<Check
											aria-label="enabled"
											className="h-3.5 w-3.5 text-fg-primary"
										/>
									)}
									<span>⌘2</span>
								</DropdownMenuShortcut>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={onStartTour}>
								<HelpCircle className="h-4 w-4" />
								<span>Feature Tour</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</TooltipProvider>
		</header>
	);
}
