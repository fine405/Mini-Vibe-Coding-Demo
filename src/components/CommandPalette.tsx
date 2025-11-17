import { FileCode2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fuzzyMatch } from "@/modules/fs/fuzzyMatch";
import { useFs } from "@/modules/fs/store";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "./ui/command";
import { Dialog, DialogContent } from "./ui/dialog";

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
	const { filesByPath, setActiveFile } = useFs();
	const [search, setSearch] = useState("");

	// Reset search when dialog closes
	useEffect(() => {
		if (!isOpen) {
			setSearch("");
		}
	}, [isOpen]);

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
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="overflow-hidden p-0 shadow-lg">
				<Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-neutral-400 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
					<CommandInput
						placeholder="Type a command or search..."
						value={search}
						onValueChange={setSearch}
					/>
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>

						{/* Custom Action Groups */}
						{Object.entries(groupedActions).map(([groupName, actions]) => (
							<CommandGroup key={groupName} heading={groupName}>
								{actions.map((action) => (
									<CommandItem
										key={action.id}
										onSelect={() => handleSelect(action.action)}
									>
										{action.icon && <span className="mr-2">{action.icon}</span>}
										<div className="flex flex-col flex-1">
											<span>{action.label}</span>
											{action.description && (
												<span className="text-xs text-neutral-500">
													{action.description}
												</span>
											)}
										</div>
										{action.shortcut && (
											<CommandShortcut>{action.shortcut}</CommandShortcut>
										)}
									</CommandItem>
								))}
							</CommandGroup>
						))}

						{/* Files */}
						{sortedFiles.length > 0 && (
							<>
								{customActions.length > 0 && <CommandSeparator />}
								<CommandGroup heading="Files">
									{sortedFiles.slice(0, 10).map((file) => (
										<CommandItem
											key={file.path}
											onSelect={() =>
												handleSelect(() => setActiveFile(file.path))
											}
										>
											<FileCode2 className="mr-2 h-4 w-4" />
											<span className="flex-1 truncate">{file.path}</span>
											{file.status !== "clean" && (
												<span
													className={`text-xs ${
														file.status === "new"
															? "text-green-400"
															: "text-blue-400"
													}`}
												>
													{file.status === "new" ? "New" : "Modified"}
												</span>
											)}
										</CommandItem>
									))}
									{sortedFiles.length > 10 && (
										<div className="px-2 py-1.5 text-xs text-neutral-500">
											+{sortedFiles.length - 10} more files
										</div>
									)}
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</DialogContent>
		</Dialog>
	);
}
