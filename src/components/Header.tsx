import { clsx } from "clsx";
import {
	Command,
	Download,
	FileArchive,
	FileJson,
	FilePlus2,
	HelpCircle,
	MessageSquare,
	TerminalSquare,
	Upload,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLayoutStore } from "@/modules/layout/store";

interface HeaderProps {
	onOpenCommandPalette?: () => void;
	onNewProject?: () => void;
	onExportJSON?: () => void;
	onExportZip?: () => void;
	onImportJSON?: () => void;
	onImportZip?: () => void;
	onStartTour?: () => void;
}

export function Header({
	onOpenCommandPalette,
	onNewProject,
	onExportJSON,
	onExportZip,
	onImportJSON,
	onImportZip,
	onStartTour,
}: HeaderProps) {
	const { showChat, showConsole, toggleChat, toggleConsole } = useLayoutStore();

	return (
		<div className="h-10 w-full bg-bg-primary border-b border-border-primary flex items-center justify-between px-4 shrink-0 text-fg-primary">
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-1.5">
					<BrandMark className="size-5" />
					<span className="text-sm font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
						Mini Lovable
					</span>
				</div>

				<div className="w-px h-4 bg-border-primary" />

				<TooltipProvider delayDuration={300}>
					<div className="flex items-center gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									aria-label="Start a new project"
									className="text-fg-muted hover:bg-bg-tertiary hover:text-fg-primary"
									onClick={onNewProject}
									size="icon-sm"
									variant="ghost"
								>
									<FilePlus2 className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Start a new project</TooltipContent>
						</Tooltip>

						{/* Import Dropdown */}
						<DropdownMenu>
							<Tooltip>
								<TooltipTrigger asChild>
									<DropdownMenuTrigger asChild>
										<Button
											aria-label="Import project"
											className="text-fg-muted hover:bg-bg-tertiary hover:text-fg-primary"
											size="icon-sm"
											variant="ghost"
										>
											<Upload className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
								</TooltipTrigger>
								<TooltipContent>Import Project</TooltipContent>
							</Tooltip>
							<DropdownMenuContent align="start">
								<DropdownMenuItem onClick={onImportJSON}>
									<FileJson className="h-4 w-4" />
									<span>Import JSON</span>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={onImportZip}>
									<FileArchive className="h-4 w-4" />
									<span>Import ZIP</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Export Dropdown */}
						<DropdownMenu>
							<Tooltip>
								<TooltipTrigger asChild>
									<DropdownMenuTrigger asChild>
										<Button
											aria-label="Export project"
											className="text-fg-muted hover:bg-bg-tertiary hover:text-fg-primary"
											size="icon-sm"
											variant="ghost"
										>
											<Download className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
								</TooltipTrigger>
								<TooltipContent>Export Project</TooltipContent>
							</Tooltip>
							<DropdownMenuContent align="start">
								<DropdownMenuItem onClick={onExportJSON}>
									<FileJson className="h-4 w-4" />
									<span>Export as JSON</span>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={onExportZip}>
									<FileArchive className="h-4 w-4" />
									<span>Export as ZIP</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</TooltipProvider>
			</div>

			<div className="flex items-center gap-1">
				<TooltipProvider delayDuration={300}>
					{/* Command Palette Trigger */}
					<Tooltip>
						<TooltipTrigger asChild>
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
							</Button>
						</TooltipTrigger>
						<TooltipContent>Open Command Palette (⌘K)</TooltipContent>
					</Tooltip>

					<div className="w-px h-4 bg-border-primary mx-1" />

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								aria-label="Toggle chat panel"
								className={clsx(
									"hover:bg-bg-tertiary",
									showChat ? "text-fg-primary" : "text-fg-muted",
								)}
								onClick={toggleChat}
								size="icon-sm"
								variant="ghost"
							>
								<MessageSquare className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Toggle Chat Panel (⌘1)</TooltipContent>
					</Tooltip>

					<div className="w-px h-4 bg-border-primary mx-1" />

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								aria-label="Toggle console panel"
								className={clsx(
									"hover:bg-bg-tertiary",
									showConsole ? "text-fg-primary" : "text-fg-muted",
								)}
								onClick={toggleConsole}
								size="icon-sm"
								variant="ghost"
							>
								<TerminalSquare className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Toggle Console Panel (⌘2)</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				<div className="w-px h-4 bg-border-primary mx-2" />
				<ThemeToggle />

				{onStartTour && (
					<>
						<div className="w-px h-4 bg-border-primary mx-2" />
						<TooltipProvider delayDuration={300}>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										aria-label="Start feature tour"
										className="text-fg-muted hover:bg-bg-tertiary hover:text-fg-primary"
										onClick={onStartTour}
										size="icon-sm"
										variant="ghost"
									>
										<HelpCircle className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Start Tour</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</>
				)}
			</div>
		</div>
	);
}
