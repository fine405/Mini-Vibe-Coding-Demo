import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
	ChevronDown,
	ChevronRight,
	Download,
	FileCode2,
	Folder,
	Pencil,
	Plus,
	Trash2,
	Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	exportProjectAsJSON,
	importProjectFromJSON,
	selectProjectFile,
} from "./export";
import { useFs } from "./store";
import type { VirtualFile } from "./types";

interface TreeNode {
	name: string;
	path: string;
	isDir: boolean;
	children?: TreeNode[];
}

function buildTree(filesByPath: Record<string, VirtualFile>): TreeNode[] {
	const root: Record<string, TreeNode> = {};

	Object.values(filesByPath).forEach((file) => {
		const segments = file.path.split("/").filter(Boolean);
		let currentLevel = root;
		let currentPath = "";

		segments.forEach((segment, index) => {
			const isLast = index === segments.length - 1;
			currentPath = `${currentPath}/${segment}`;
			const key = currentPath;

			if (!currentLevel[key]) {
				currentLevel[key] = {
					name: segment,
					path: currentPath,
					isDir: !isLast,
					children: !isLast ? [] : undefined,
				};
			}

			if (!isLast && currentLevel[key].children) {
				const nextLevel: Record<string, TreeNode> = {};
				currentLevel[key].children.forEach((child) => {
					nextLevel[child.path] = child;
				});
				currentLevel = nextLevel;
			}
		});
	});

	const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
		const sorted = [...nodes].sort((a, b) => {
			if (a.isDir && !b.isDir) return -1;
			if (!a.isDir && b.isDir) return 1;
			return a.name.localeCompare(b.name);
		});
		sorted.forEach((n) => {
			if (n.children) n.children = sortNodes(n.children);
		});
		return sorted;
	};

	return sortNodes(Object.values(root));
}

interface TreeRowProps {
	node: TreeNode;
	depth: number;
	activePath: string | null;
	onSelect: (path: string) => void;
	filesByPath: Record<string, VirtualFile>;
}

function TreeRow({
	node,
	depth,
	activePath,
	onSelect,
	filesByPath,
}: TreeRowProps) {
	const [expanded, setExpanded] = useState(true);
	const isActive = activePath === node.path;
	const fileStatus = !node.isDir ? filesByPath[node.path]?.status : null;

	const handleClick = () => {
		if (node.isDir) {
			setExpanded((v) => !v);
		} else {
			onSelect(node.path);
		}
	};

	return (
		<div>
			<button
				type="button"
				onClick={handleClick}
				className={`flex w-full items-center gap-1 px-2 py-1.5 text-xs text-left hover:bg-neutral-800/60 ${
					isActive ? "bg-neutral-800/80 text-neutral-50" : "text-neutral-300"
				}`}
				style={{ paddingLeft: 8 + depth * 12 }}
			>
				{node.isDir ? (
					expanded ? (
						<ChevronDown className="h-3 w-3 text-neutral-500" />
					) : (
						<ChevronRight className="h-3 w-3 text-neutral-500" />
					)
				) : (
					<span className="inline-block w-3" />
				)}
				{node.isDir ? (
					<Folder className="mr-1 h-3 w-3 text-neutral-500" />
				) : (
					<FileCode2 className="mr-1 h-3 w-3 text-neutral-500" />
				)}
				<span className="truncate flex-1">{node.name}</span>
				{!node.isDir && fileStatus && fileStatus !== "clean" && (
					<span
						className={`ml-auto text-[9px] font-semibold px-1 py-0.5 rounded ${
							fileStatus === "new"
								? "bg-green-500/20 text-green-400"
								: "bg-blue-500/20 text-blue-400"
						}`}
					>
						{fileStatus === "new" ? "N" : "M"}
					</span>
				)}
			</button>
			{node.isDir && expanded && node.children && node.children.length > 0 && (
				<div>
					{node.children.map((child) => (
						<TreeRow
							key={child.path}
							node={child}
							depth={depth + 1}
							activePath={activePath}
							onSelect={onSelect}
							filesByPath={filesByPath}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export function FileTreePane() {
	const {
		filesByPath,
		activeFilePath,
		createFile,
		deleteFile,
		renameFile,
		setActiveFile,
		setFiles,
		resetFs,
	} = useFs();

	const tree = useMemo(() => buildTree(filesByPath), [filesByPath]);

	const handleNewFile = () => {
		const path = window.prompt("Enter new file path (e.g., /src/NewFile.tsx):");
		if (!path) return;
		if (!path.startsWith("/")) {
			alert("Path must start with /");
			return;
		}
		if (filesByPath[path]) {
			alert("File already exists");
			return;
		}
		createFile(path, "// New file\n");
		setActiveFile(path);
	};

	const handleRename = () => {
		if (!activeFilePath || !filesByPath[activeFilePath]) {
			alert("Please select a file first");
			return;
		}
		const newPath = window.prompt("Enter new path:", activeFilePath);
		if (!newPath || newPath === activeFilePath) return;
		if (!newPath.startsWith("/")) {
			alert("Path must start with /");
			return;
		}
		if (filesByPath[newPath]) {
			alert("A file with that path already exists");
			return;
		}
		renameFile(activeFilePath, newPath);
		setActiveFile(newPath);
	};

	const handleDelete = () => {
		if (!activeFilePath || !filesByPath[activeFilePath]) {
			alert("Please select a file first");
			return;
		}
		const confirmed = window.confirm(
			`Delete ${activeFilePath}?\nThis cannot be undone.`,
		);
		if (!confirmed) return;
		deleteFile(activeFilePath);
		setActiveFile(null);
	};

	const handleNewProject = () => {
		const confirmed = window.confirm(
			"Reset to a new project?\nAll current files will be lost.",
		);
		if (!confirmed) return;
		resetFs();
		setActiveFile(null);
	};

	const handleExport = () => {
		const projectName = window.prompt("Enter project name:", "my-project");
		if (!projectName) return;
		exportProjectAsJSON(filesByPath, projectName);
	};

	const handleImport = async () => {
		const confirmed = window.confirm(
			"Import a project?\nThis will replace all current files.",
		);
		if (!confirmed) return;

		try {
			const file = await selectProjectFile();
			const importedFiles = await importProjectFromJSON(file);
			setFiles(importedFiles);
			setActiveFile(null);
			alert("Project imported successfully!");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to import project";
			alert(`Import failed: ${message}`);
		}
	};

	return (
		<div className="flex h-full w-full flex-col bg-neutral-950/80 text-neutral-100">
			<div className="flex items-center justify-between border-b border-neutral-800/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
				<div className="flex items-center gap-2">
					<span>Files</span>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={handleNewProject}
							className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-neutral-800/60 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors"
							title="New Project"
						>
							New Project
						</button>
						<button
							type="button"
							onClick={handleExport}
							className="rounded p-1 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition-colors"
							title="Export Project"
						>
							<Download className="h-3 w-3" />
						</button>
						<button
							type="button"
							onClick={handleImport}
							className="rounded p-1 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition-colors"
							title="Import Project"
						>
							<Upload className="h-3 w-3" />
						</button>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={handleNewFile}
						className="rounded p-1 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition-colors"
						title="New file"
					>
						<Plus className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						onClick={handleRename}
						disabled={!activeFilePath}
						className="rounded p-1 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
						title="Rename file"
					>
						<Pencil className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						onClick={handleDelete}
						disabled={!activeFilePath}
						className="rounded p-1 hover:bg-neutral-800/60 text-neutral-400 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
						title="Delete file"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
			<ScrollArea.Root className="flex-1">
				<ScrollArea.Viewport className="h-full w-full">
					<div className="py-1 text-xs">
						{tree.map((node) => (
							<TreeRow
								key={node.path}
								node={node}
								depth={0}
								activePath={activeFilePath}
								onSelect={setActiveFile}
								filesByPath={filesByPath}
							/>
						))}
					</div>
				</ScrollArea.Viewport>
				<ScrollArea.Scrollbar
					orientation="vertical"
					className="flex w-1.5 touch-none select-none bg-neutral-900/80"
				>
					<ScrollArea.Thumb className="relative flex-1 rounded-full bg-neutral-600" />
				</ScrollArea.Scrollbar>
			</ScrollArea.Root>
		</div>
	);
}
