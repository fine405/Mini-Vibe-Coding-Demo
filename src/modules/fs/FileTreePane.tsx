import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useEditor } from "@/modules/editor";
import { TreeRow } from "./FileTreeRow";
import { useFs } from "./store";
import { buildTree, filterTree } from "./tree";

export function FileTreePane() {
	const {
		filesByPath,
		createFile,
		deleteFile,
		renameFile,
		deleteDirectory,
		renameDirectory,
	} = useFs();

	const {
		openFile,
		activeFilePath,
		closeFile,
		closeFilesInDirectory,
		renameOpenFile,
		renameOpenFilesInDirectory,
	} = useEditor();

	const [searchQuery, setSearchQuery] = useState("");
	const [renamingPath, setRenamingPath] = useState<string | null>(null);
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [fileToDelete, setFileToDelete] = useState<string | null>(null);
	const deleteButtonRef = useRef<HTMLButtonElement>(null);
	const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
	const [newFilePath, setNewFilePath] = useState("/src/NewFile.tsx");
	const [newFileError, setNewFileError] = useState("");
	const newFileInputRef = useRef<HTMLInputElement>(null);

	const tree = useMemo(() => buildTree(filesByPath), [filesByPath]);
	const filteredTree = useMemo(
		() => filterTree(tree, searchQuery),
		[tree, searchQuery],
	);

	// Auto-focus delete button when dialog opens
	useEffect(() => {
		if (deleteDialogOpen && deleteButtonRef.current) {
			deleteButtonRef.current.focus();
		}
	}, [deleteDialogOpen]);

	const handleNewFile = () => {
		setNewFilePath("/src/NewFile.tsx");
		setNewFileError("");
		setNewFileDialogOpen(true);
	};

	const handleNewFileDialogChange = (open: boolean) => {
		setNewFileDialogOpen(open);
		if (!open) {
			setNewFileError("");
		}
	};

	useEffect(() => {
		if (newFileDialogOpen && newFileInputRef.current) {
			setTimeout(() => newFileInputRef.current?.focus(), 0);
		}
	}, [newFileDialogOpen]);

	const submitNewFile = (e?: React.FormEvent) => {
		e?.preventDefault();
		const trimmedPath = newFilePath.trim();
		if (!trimmedPath) {
			setNewFileError("Path is required");
			return;
		}
		if (!trimmedPath.startsWith("/")) {
			setNewFileError("Path must start with /");
			return;
		}
		if (filesByPath[trimmedPath]) {
			setNewFileError("File already exists");
			return;
		}
		createFile(trimmedPath, "// New file\n");
		openFile(trimmedPath);
		handleNewFileDialogChange(false);
	};

	const handleRename = (path: string, isDir: boolean) => {
		if (!isDir && !filesByPath[path]) return;
		setRenamingPath(path);
	};

	const onRenameSubmit = (oldPath: string, newPath: string, isDir: boolean) => {
		setRenamingPath(null);
		if (oldPath === newPath) return;

		if (!newPath.startsWith("/")) {
			alert("Path must start with /");
			return;
		}

		if (isDir) {
			// Check if any file would conflict with new directory path
			const oldPrefix = oldPath.endsWith("/") ? oldPath : `${oldPath}/`;
			const newPrefix = newPath.endsWith("/") ? newPath : `${newPath}/`;
			const hasConflict = Object.keys(filesByPath).some(
				(p) => !p.startsWith(oldPrefix) && p.startsWith(newPrefix),
			);
			if (hasConflict) {
				alert("A directory or file with that path already exists");
				return;
			}
			renameDirectory(oldPath, newPath);
			// Update open tabs for files inside the renamed directory
			renameOpenFilesInDirectory(oldPath, newPath);
		} else {
			if (filesByPath[newPath]) {
				alert("A file with that path already exists");
				return;
			}
			renameFile(oldPath, newPath);
			// Update the tab for the renamed file
			renameOpenFile(oldPath, newPath);
		}
	};

	const [isDeleteDir, setIsDeleteDir] = useState(false);

	const handleDelete = (path: string, isDir: boolean) => {
		if (!isDir && !filesByPath[path]) return;
		setFileToDelete(path);
		setIsDeleteDir(isDir);
		setDeleteDialogOpen(true);
	};

	const confirmDelete = () => {
		if (fileToDelete) {
			if (isDeleteDir) {
				deleteDirectory(fileToDelete);
				// Close all open files inside the deleted directory
				closeFilesInDirectory(fileToDelete);
			} else {
				deleteFile(fileToDelete);
				if (activeFilePath === fileToDelete) {
					closeFile(fileToDelete);
				}
			}
		}
		setDeleteDialogOpen(false);
		setFileToDelete(null);
		setIsDeleteDir(false);
	};

	return (
		<div className="flex h-full w-full flex-col bg-neutral-950/80 text-neutral-100">
			<div className="flex items-center justify-between border-b border-neutral-800/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
				<span>Files</span>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={handleNewFile}
						className="rounded p-1 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition-colors"
						title="New file"
					>
						<Plus className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
			{/* Search Input */}
			<div className="px-2 py-2 border-b border-neutral-800/60">
				<div className="relative">
					<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-500" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search files..."
						className="w-full pl-7 pr-7 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-100 placeholder:text-neutral-500"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-neutral-700 text-neutral-500 hover:text-neutral-300 transition-colors"
							title="Clear search"
						>
							<X className="h-3 w-3" />
						</button>
					)}
				</div>
			</div>
			<ScrollArea.Root className="flex-1">
				<ScrollArea.Viewport className="h-full w-full">
					<div className="py-1 text-xs">
						{filteredTree.length > 0 ? (
							filteredTree.map((node) => (
								<TreeRow
									key={node.path}
									node={node}
									depth={0}
									activePath={activeFilePath}
									selectedPath={selectedPath}
									onSelect={(path, isDir) => {
										setSelectedPath(path);
										if (!isDir) {
											openFile(path);
										}
									}}
									filesByPath={filesByPath}
									searchQuery={searchQuery}
									onRename={handleRename}
									onDelete={handleDelete}
									renamingPath={renamingPath}
									onRenameSubmit={onRenameSubmit}
									onRenameCancel={() => setRenamingPath(null)}
								/>
							))
						) : (
							<div className="px-3 py-8 text-center text-neutral-500 text-xs">
								{searchQuery ? "No files match your search" : "No files"}
							</div>
						)}
					</div>
				</ScrollArea.Viewport>
				<ScrollArea.Scrollbar
					orientation="vertical"
					className="flex w-1.5 touch-none select-none bg-neutral-900/80"
				>
					<ScrollArea.Thumb className="relative flex-1 rounded-full bg-neutral-600" />
				</ScrollArea.Scrollbar>
			</ScrollArea.Root>

			<Dialog open={newFileDialogOpen} onOpenChange={handleNewFileDialogChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New File</DialogTitle>
						<DialogDescription>
							Provide the full path starting from the workspace root (e.g.
							/src/NewFile.tsx).
						</DialogDescription>
					</DialogHeader>
					<form className="space-y-4" onSubmit={submitNewFile}>
						<label className="flex flex-col gap-1 text-sm text-neutral-300">
							<span>File path</span>
							<input
								type="text"
								ref={newFileInputRef}
								value={newFilePath}
								onChange={(e) => {
									setNewFilePath(e.target.value);
									setNewFileError("");
								}}
								className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
								placeholder="/src/NewFile.tsx"
							/>
						</label>
						{newFileError && (
							<p className="text-xs text-red-400">{newFileError}</p>
						)}
						<DialogFooter>
							<button
								type="button"
								onClick={() => handleNewFileDialogChange(false)}
								className="px-3 py-1.5 text-sm rounded hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-neutral-200"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-3 py-1.5 text-sm rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-medium transition-colors"
							>
								Create File
							</button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							confirmDelete();
						}
					}}
				>
					<DialogHeader>
						<DialogTitle>
							Delete {isDeleteDir ? "Directory" : "File"}
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete{" "}
							<span className="font-mono text-neutral-300">{fileToDelete}</span>
							{isDeleteDir && " and all its contents"}? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<button
							type="button"
							className="px-3 py-1.5 text-sm rounded hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-neutral-200"
							onClick={() => setDeleteDialogOpen(false)}
						>
							Cancel
						</button>
						<button
							ref={deleteButtonRef}
							type="button"
							className="px-3 py-1.5 text-sm bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded transition-colors font-medium"
							onClick={confirmDelete}
						>
							Delete
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
