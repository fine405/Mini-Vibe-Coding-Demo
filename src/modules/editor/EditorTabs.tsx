import { FileCode2, GitCompare, X } from "lucide-react";
import type { OpenFile } from "./types";

interface EditorTabsProps {
	openFiles: OpenFile[];
	activeFilePath: string | null;
	onSelectTab: (path: string) => void;
	onCloseTab: (path: string) => void;
	onToggleViewMode: (path: string) => void;
	getFileStatus: (path: string) => "clean" | "new" | "modified";
}

export function EditorTabs({
	openFiles,
	activeFilePath,
	onSelectTab,
	onCloseTab,
	onToggleViewMode,
	getFileStatus,
}: EditorTabsProps) {
	if (openFiles.length === 0) {
		return null;
	}

	return (
		<div className="flex items-center border-b border-neutral-800/60 bg-neutral-900/50 overflow-x-auto">
			{openFiles.map((file) => {
				const isActive = file.path === activeFilePath;
				const fileName = file.path.split("/").pop() || file.path;
				const status = getFileStatus(file.path);
				const isModified = status === "modified" || status === "new";

				return (
					<button
						type="button"
						key={file.path}
						className={`group flex items-center gap-1 px-3 py-1.5 text-xs border-r border-neutral-800/40 cursor-pointer transition-colors ${
							isActive
								? "bg-neutral-800/80 text-neutral-100"
								: "text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200"
						}`}
						onClick={() => onSelectTab(file.path)}
						title={file.path}
					>
						<FileCode2 className="h-3 w-3 text-neutral-500 shrink-0" />
						<span className="truncate max-w-32">{fileName}</span>

						{/* Status indicator */}
						{isModified && (
							<span
								className={`h-1.5 w-1.5 rounded-full shrink-0 ${
									status === "new" ? "bg-green-400" : "bg-blue-400"
								}`}
							/>
						)}

						{/* View mode toggle (only for modified files) */}
						{isModified && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onToggleViewMode(file.path);
								}}
								className={`p-0.5 rounded transition-colors ${
									file.viewMode === "diff"
										? "text-blue-400 bg-blue-500/20"
										: "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50"
								}`}
								title={
									file.viewMode === "diff"
										? "Switch to Editor"
										: "Switch to Diff"
								}
							>
								<GitCompare className="h-3 w-3" />
							</button>
						)}

						{/* Close button */}
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onCloseTab(file.path);
							}}
							className="p-0.5 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
							title="Close"
						>
							<X className="h-3 w-3" />
						</button>
					</button>
				);
			})}
		</div>
	);
}
