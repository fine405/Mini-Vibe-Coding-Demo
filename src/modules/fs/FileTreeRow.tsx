import { ChevronDown, ChevronRight, FileCode2, Folder } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { fuzzyMatch } from "./fuzzyMatch";
import type { TreeNode } from "./tree";
import type { VirtualFile } from "./types";

interface HighlightedTextProps {
	text: string;
	query: string;
}

function HighlightedText({ text, query }: HighlightedTextProps) {
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
		if (index > lastIndex) {
			parts.push(
				<span key={`text-${lastIndex}-${index}`}>
					{text.substring(lastIndex, index)}
				</span>,
			);
		}
		parts.push(
			<span key={`match-${index}`} className="bg-yellow-500/30 text-yellow-200">
				{text[index]}
			</span>,
		);
		lastIndex = index + 1;
	});

	if (lastIndex < text.length) {
		parts.push(<span key="text-end">{text.substring(lastIndex)}</span>);
	}

	return <>{parts}</>;
}

export interface TreeRowProps {
	node: TreeNode;
	depth: number;
	activePath: string | null;
	selectedPath: string | null;
	onSelect: (path: string, isDir: boolean) => void;
	filesByPath: Record<string, VirtualFile>;
	searchQuery?: string;
	onRename: (path: string, isDir: boolean) => void;
	onDelete: (path: string, isDir: boolean) => void;
	renamingPath: string | null;
	onRenameSubmit: (oldPath: string, newPath: string, isDir: boolean) => void;
	onRenameCancel: () => void;
}

export function TreeRow({
	node,
	depth,
	activePath,
	selectedPath,
	onSelect,
	filesByPath,
	searchQuery,
	onRename,
	onDelete,
	renamingPath,
	onRenameSubmit,
	onRenameCancel,
}: TreeRowProps) {
	const [expanded, setExpanded] = useState(true);
	const isSelected = selectedPath === node.path;
	const isActive = activePath === node.path;
	const fileStatus = !node.isDir ? filesByPath[node.path]?.status : null;
	const isRenaming = renamingPath === node.path;
	const [renameValue, setRenameValue] = useState(node.path);
	const inputRef = useRef<HTMLInputElement>(null);

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

	if (isRenaming && renameValue !== node.path && renameValue === "") {
		setRenameValue(node.path);
	}

	useEffect(() => {
		if (isRenaming && inputRef.current) {
			const input = inputRef.current;
			input.focus();
			setRenameValue(node.path);
			const lastSlash = node.path.lastIndexOf("/");
			const lastDot = node.path.lastIndexOf(".");
			const filenameStart = lastSlash + 1;
			const filenameEnd = lastDot > lastSlash ? lastDot : node.path.length;
			setTimeout(() => {
				input.setSelectionRange(filenameStart, filenameEnd);
			}, 0);
		}
	}, [isRenaming, node.path]);

	const handleClick = () => {
		if (node.isDir) {
			setExpanded((v) => !v);
		}
		onSelect(node.path, node.isDir);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && isSelected && !isRenaming) {
			e.preventDefault();
			e.stopPropagation();
			onRename(node.path, node.isDir);
		}
		if (e.key === "Backspace" && e.metaKey && isSelected && !isRenaming) {
			e.preventDefault();
			e.stopPropagation();
			onDelete(node.path, node.isDir);
		}
	};

	const handleRenameBlur = () => {
		onRenameSubmit(node.path, renameValue, node.isDir);
	};

	const handleRenameKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			e.stopPropagation();
			onRenameSubmit(node.path, renameValue, node.isDir);
		} else if (e.key === "Escape") {
			e.preventDefault();
			e.stopPropagation();
			onRenameCancel();
		}
	};

	return (
		<div>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<button
						type="button"
						onClick={handleClick}
						onKeyDown={handleKeyDown}
						onContextMenu={() => {
							onSelect(node.path, node.isDir);
						}}
						className={`flex w-full items-center gap-1 px-2 py-1.5 text-xs text-left hover:bg-neutral-800/60 ${
							(isSelected || isActive) && !isRenaming
								? "bg-neutral-800/80 text-neutral-50"
								: "text-neutral-300"
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
						{isRenaming ? (
							<input
								ref={inputRef}
								type="text"
								value={renameValue}
								onChange={(e) => setRenameValue(e.target.value)}
								onKeyDown={handleRenameKeyDown}
								onBlur={handleRenameBlur}
								onClick={(e) => e.stopPropagation()}
								className="flex-1 min-w-0 bg-neutral-950 text-neutral-100 border border-blue-500/50 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 selection:bg-blue-500/40"
							/>
						) : (
							<span className="truncate flex-1">
								{searchQuery && !node.isDir ? (
									<HighlightedText text={node.path} query={searchQuery} />
								) : (
									node.name
								)}
							</span>
						)}
						{!isRenaming && node.isDir && hasChanges && (
							<span
								className="ml-auto flex items-center justify-center px-1 py-0.5"
								title="Contains modified files"
							>
								<span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
							</span>
						)}
						{!isRenaming &&
							!node.isDir &&
							fileStatus &&
							fileStatus !== "clean" && (
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
				</ContextMenuTrigger>
				<ContextMenuContent className="w-64">
					<ContextMenuItem disabled>Upload Files</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem disabled>
						Cut <ContextMenuShortcut>⌘X</ContextMenuShortcut>
					</ContextMenuItem>
					<ContextMenuItem disabled>
						Copy <ContextMenuShortcut>⌘C</ContextMenuShortcut>
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() => navigator.clipboard.writeText(node.path)}
					>
						Copy Path <ContextMenuShortcut>⌥⌘C</ContextMenuShortcut>
					</ContextMenuItem>
					<ContextMenuItem
						onClick={() => navigator.clipboard.writeText(node.name)}
					>
						Copy Relative Path <ContextMenuShortcut>⇧⌥⌘C</ContextMenuShortcut>
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem onClick={() => onRename(node.path, node.isDir)}>
						Rename... <ContextMenuShortcut>Enter</ContextMenuShortcut>
					</ContextMenuItem>
					<ContextMenuItem
						onClick={() => onDelete(node.path, node.isDir)}
						className="text-red-400 focus:text-red-400"
					>
						Delete <ContextMenuShortcut>⌫</ContextMenuShortcut>
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
			{node.isDir && expanded && node.children && node.children.length > 0 && (
				<div>
					{node.children.map((child) => (
						<TreeRow
							key={child.path}
							node={child}
							depth={depth + 1}
							activePath={activePath}
							selectedPath={selectedPath}
							onSelect={onSelect}
							filesByPath={filesByPath}
							searchQuery={searchQuery}
							onRename={onRename}
							onDelete={onDelete}
							renamingPath={renamingPath}
							onRenameSubmit={onRenameSubmit}
							onRenameCancel={onRenameCancel}
						/>
					))}
				</div>
			)}
		</div>
	);
}
