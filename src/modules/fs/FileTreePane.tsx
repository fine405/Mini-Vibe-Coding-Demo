import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
	ChevronDown,
	ChevronRight,
	Download,
	FileCode2,
	Folder,
	Pencil,
	Plus,
	Search,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	exportProjectAsJSON,
	importProjectFromJSON,
	selectProjectFile,
} from "./export";
import { fuzzyMatch } from "./fuzzyMatch";
import { useFs } from "./store";
import type { VirtualFile } from "./types";

interface TreeNode {
	name: string;
	path: string;
	isDir: boolean;
	children?: TreeNode[];
}

function buildTree(filesByPath: Record<string, VirtualFile>): TreeNode[] {
	// Build a map of all nodes (files and directories)
	const nodeMap = new Map<string, TreeNode>();

	// First pass: create all nodes
	Object.values(filesByPath).forEach((file) => {
		const segments = file.path.split("/").filter(Boolean);
		let currentPath = "";

		segments.forEach((segment, index) => {
			const isLast = index === segments.length - 1;
			currentPath = currentPath ? `${currentPath}/${segment}` : `/${segment}`;

			if (!nodeMap.has(currentPath)) {
				nodeMap.set(currentPath, {
					name: segment,
					path: currentPath,
					isDir: !isLast,
					children: !isLast ? [] : undefined,
				});
			}
		});
	});

	// Second pass: build parent-child relationships
	const rootNodes: TreeNode[] = [];

	nodeMap.forEach((node) => {
		const parentPath = node.path.substring(0, node.path.lastIndexOf("/"));

		if (!parentPath) {
			// Root level node
			rootNodes.push(node);
		} else {
			// Add to parent's children
			const parent = nodeMap.get(parentPath);
			if (parent?.children) {
				parent.children.push(node);
			}
		}
	});

	// Sort nodes recursively
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

	return sortNodes(rootNodes);
}

/**
 * Filter tree nodes based on fuzzy search query
 * Returns nodes that match or have children that match
 */
function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
	if (!query) return nodes;

	const filtered: TreeNode[] = [];

	for (const node of nodes) {
		if (node.isDir && node.children) {
			// For directories, recursively filter children
			const filteredChildren = filterTree(node.children, query);
			if (filteredChildren.length > 0) {
				filtered.push({
					...node,
					children: filteredChildren,
				});
			}
		} else {
			// For files, check if path matches the query
			const matchResult = fuzzyMatch(query, node.path);
			if (matchResult.matched) {
				filtered.push(node);
			}
		}
	}

	return filtered;
}

/**
 * Highlight matched characters in text
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
	if (!query) {
		return <>{text}</>;
	}

	const matchResult = fuzzyMatch(query, text);
	if (!matchResult.matched) {
		return <>{text}</>;
	}

	const parts: React.ReactNode[] = [];
	let lastIndex = 0;

	matchResult.matchedIndices.forEach((index) => {
		// Add text before match
		if (index > lastIndex) {
			parts.push(
				<span key={`text-${lastIndex}-${index}`}>
					{text.substring(lastIndex, index)}
				</span>,
			);
		}
		// Add highlighted character
		parts.push(
			<span key={`match-${index}`} className="bg-yellow-500/30 text-yellow-200">
				{text[index]}
			</span>,
		);
		lastIndex = index + 1;
	});

	// Add remaining text
	if (lastIndex < text.length) {
		parts.push(<span key="text-end">{text.substring(lastIndex)}</span>);
	}

	return <>{parts}</>;
}

interface TreeRowProps {
	node: TreeNode;
	depth: number;
	activePath: string | null;
	onSelect: (path: string) => void;
	filesByPath: Record<string, VirtualFile>;
	searchQuery?: string;
}

function TreeRow({
	node,
	depth,
	activePath,
	onSelect,
	filesByPath,
	searchQuery,
}: TreeRowProps) {
	const [expanded, setExpanded] = useState(true);
	const isActive = activePath === node.path;
	const fileStatus = !node.isDir ? filesByPath[node.path]?.status : null;

	// Check if folder has any modified or new files
	const hasChanges = useMemo(() => {
		if (!node.isDir) return false;

		const checkNode = (n: TreeNode): boolean => {
			if (!n.isDir) {
				const status = filesByPath[n.path]?.status;
				return status === "new" || status === "modified";
			}
			return n.children?.some(checkNode) ?? false;
		};

		return node.children?.some(checkNode) ?? false;
	}, [node, filesByPath]);

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
				<span className="truncate flex-1">
					{searchQuery && !node.isDir ? (
						<HighlightedText text={node.path} query={searchQuery} />
					) : (
						node.name
					)}
				</span>
				{/* Folder change indicator */}
				{node.isDir && hasChanges && (
					<span
						className="ml-auto flex items-center justify-center px-1 py-0.5"
						title="Contains modified files"
					>
						<span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
					</span>
				)}
				{/* File status badge */}
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
							searchQuery={searchQuery}
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

	const [searchQuery, setSearchQuery] = useState("");
	const tree = useMemo(() => buildTree(filesByPath), [filesByPath]);
	const filteredTree = useMemo(
		() => filterTree(tree, searchQuery),
		[tree, searchQuery],
	);

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
			"Start a new project?\nThis will clear all current files and storage.",
		);
		if (!confirmed) return;
		resetFs();
		setActiveFile(null);
		toast.success("New project created", {
			description: "All files and storage cleared",
		});
	};

	const handleExport = () => {
		const projectName = window.prompt("Enter project name:", "my-project");
		if (!projectName) return;
		exportProjectAsJSON(filesByPath, projectName);
		toast.success("Project exported", {
			description: `${projectName}.json downloaded`,
		});
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
			const fileCount = Object.keys(importedFiles).length;
			toast.success("Project imported successfully", {
				description: `${fileCount} files loaded and saved to storage`,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to import project";
			toast.error("Import failed", {
				description: message,
			});
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
							1 New Project
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
									onSelect={setActiveFile}
									filesByPath={filesByPath}
									searchQuery={searchQuery}
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
		</div>
	);
}
