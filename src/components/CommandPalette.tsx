import { defaultFilter } from "cmdk";
import { FileCode2 } from "lucide-react";
import { useState } from "react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEditor } from "@/modules/editor/store";
import { fuzzyMatch } from "@/modules/fs/fuzzyMatch";
import { useBrowserWorkspaceFiles } from "@/modules/workspace/browser";

export interface CommandAction {
	id: string;
	label: string;
	description?: string;
	icon?: React.ReactNode;
	keywords?: string[];
	action: () => void;
	shortcut?: string;
	group?: string;
}

interface CommandPaletteProps {
	isOpen: boolean;
	onClose: () => void;
	customActions?: CommandAction[];
}

export function CommandPalette({
	isOpen,
	onClose,
	customActions = [],
}: CommandPaletteProps) {
	const filesByPath = useBrowserWorkspaceFiles();
	const { openFile } = useEditor();
	const [search, setSearch] = useState("");

	// Get all files for "Open File" action
	const files = Object.values(filesByPath);

	// Filter files based on search
	const filteredFiles = search
		? files.filter((file) => {
				const result = fuzzyMatch(search, file.path);
				return result.matched;
			})
		: files;

	// Sort filtered files by fuzzy match score
	const sortedFiles = [...filteredFiles].sort((a, b) => {
		const scoreA = fuzzyMatch(search, a.path).score;
		const scoreB = fuzzyMatch(search, b.path).score;
		return scoreB - scoreA;
	});

	// Group custom actions by group
	const groupedActions = customActions.reduce(
		(acc, action) => {
			const actionText = [
				action.label,
				action.description,
				action.shortcut,
			].join(" ");
			if (search && defaultFilter(actionText, search, action.keywords) === 0) {
				return acc;
			}

			const group = action.group || "Actions";
			if (!acc[group]) {
				acc[group] = [];
			}
			acc[group].push(action);
			return acc;
		},
		{} as Record<string, CommandAction[]>,
	);

	const handleSelect = (callback: () => void) => {
		callback();
		setSearch("");
		onClose();
	};
	const handleOpenChange = (open: boolean) => {
		if (open) return;
		setSearch("");
		onClose();
	};
	const fileResults = sortedFiles.length > 0 && (
		<>
			{customActions.length > 0 && (
				<CommandSeparator className="bg-border-primary" />
			)}
			<CommandGroup heading="Files">
				{sortedFiles.slice(0, 10).map((file) => (
					<CommandItem
						key={file.path}
						onSelect={() => handleSelect(() => openFile(file.path))}
						className="data-[selected=true]:bg-bg-tertiary data-[selected=true]:text-fg-primary"
					>
						<FileCode2 className="mr-2 h-4 w-4" />
						<span className="flex-1 truncate">{file.path}</span>
						{file.status !== "clean" && (
							<span
								className={`text-xs ${
									file.status === "new" ? "text-success" : "text-accent"
								}`}
							>
								{file.status === "new" ? "New" : "Modified"}
							</span>
						)}
					</CommandItem>
				))}
				{sortedFiles.length > 10 && (
					<div className="px-2 py-1.5 text-xs text-fg-muted">
						+{sortedFiles.length - 10} more files
					</div>
				)}
			</CommandGroup>
		</>
	);

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="overflow-hidden p-0 shadow-lg bg-bg-secondary text-fg-primary border-border-primary">
				<Command
					shouldFilter={false}
					className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-muted [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
				>
					<CommandInput
						placeholder="Type a command or search..."
						value={search}
						onValueChange={setSearch}
						className="text-fg-primary placeholder:text-fg-muted border-b border-border-primary"
					/>
					<CommandList>
						<CommandEmpty className="py-6 text-center text-sm text-fg-muted">
							No results found.
						</CommandEmpty>

						{search && fileResults}
						{Object.entries(groupedActions).map(([groupName, actions]) => (
							<CommandGroup key={groupName} heading={groupName}>
								{actions.map((action) => (
									<CommandItem
										key={action.id}
										onSelect={() => handleSelect(action.action)}
										className="data-[selected=true]:bg-bg-tertiary data-[selected=true]:text-fg-primary"
									>
										{action.icon && <span className="mr-2">{action.icon}</span>}
										<div className="flex flex-col flex-1">
											<span>{action.label}</span>
											{action.description && (
												<span className="text-xs text-fg-muted">
													{action.description}
												</span>
											)}
										</div>
										{action.shortcut && (
											<CommandShortcut className="text-fg-muted">
												{action.shortcut}
											</CommandShortcut>
										)}
									</CommandItem>
								))}
							</CommandGroup>
						))}
						{!search && fileResults}
					</CommandList>
				</Command>
			</DialogContent>
		</Dialog>
	);
}
