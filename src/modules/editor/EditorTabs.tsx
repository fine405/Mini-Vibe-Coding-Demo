import { FileCode2, GitCompare, RotateCcw, X } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { OpenFile } from "./types";

interface EditorTabsProps {
	openFiles: OpenFile[];
	activeFilePath: string | null;
	onSelectTab: (path: string) => void;
	onCloseTab: (path: string) => void;
	onToggleViewMode: (path: string) => void;
	getFileStatus: (path: string) => "clean" | "new" | "modified";
	onRevert: (path: string) => void;
	canRevert: (path: string) => boolean;
}

export function EditorTabs({
	openFiles,
	activeFilePath,
	onSelectTab,
	onCloseTab,
	onToggleViewMode,
	getFileStatus,
	onRevert,
	canRevert,
}: EditorTabsProps) {
	if (openFiles.length === 0) {
		return null;
	}

	return (
		<TooltipProvider delayDuration={300}>
			<div className="flex items-center border-b border-border-primary bg-bg-secondary overflow-x-auto">
				{openFiles.map((file) => {
					const isActive = file.path === activeFilePath;
					const fileName = file.path.split("/").pop() || file.path;
					const status = getFileStatus(file.path);
					const isModified = status === "modified" || status === "new";

					return (
						<button
							type="button"
							key={file.path}
							className={`group flex items-center gap-1 px-3 py-1.5 text-xs border-r border-border-secondary cursor-pointer transition-colors ${
								isActive
									? "bg-bg-primary text-fg-primary"
									: "text-fg-secondary hover:bg-bg-tertiary hover:text-fg-primary"
							}`}
							onClick={() => onSelectTab(file.path)}
							title={file.path}
						>
							<FileCode2 className="h-3 w-3 text-fg-muted shrink-0" />
							<span className="truncate max-w-32">{fileName}</span>

							{/* Status indicator */}
							{isModified && (
								<span
									className={`h-1.5 w-1.5 rounded-full shrink-0 ${
										status === "new" ? "bg-success" : "bg-accent"
									}`}
								/>
							)}

							{/* View mode toggle (only for modified files) */}
							{isModified && (
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onToggleViewMode(file.path);
											}}
											className={`p-0.5 rounded transition-colors shrink-0 ${
												file.viewMode === "diff"
													? "text-accent bg-accent/20"
													: "text-fg-muted hover:text-fg-primary hover:bg-bg-tertiary"
											}`}
										>
											<GitCompare className="h-3 w-3" />
										</button>
									</TooltipTrigger>
									<TooltipContent>
										{file.viewMode === "diff"
											? "Switch to editor"
											: "View diff"}
									</TooltipContent>
								</Tooltip>
							)}

							{/* Revert button (only for modified files with original content) */}
							{canRevert(file.path) && (
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onRevert(file.path);
											}}
											className="p-0.5 rounded transition-colors shrink-0 text-fg-muted hover:text-warning hover:bg-warning/20"
										>
											<RotateCcw className="h-3 w-3" />
										</button>
									</TooltipTrigger>
									<TooltipContent>Revert changes</TooltipContent>
								</Tooltip>
							)}

							{/* Close button */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onCloseTab(file.path);
								}}
								className="p-0.5 rounded text-fg-muted hover:text-fg-primary hover:bg-bg-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
								title="Close"
							>
								<X className="h-3 w-3" />
							</button>
						</button>
					);
				})}
			</div>
		</TooltipProvider>
	);
}
