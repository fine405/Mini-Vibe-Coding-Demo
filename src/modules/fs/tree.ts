import { fuzzyMatch } from "./fuzzyMatch";
import type { VirtualFile } from "./types";

export interface TreeNode {
	name: string;
	path: string;
	isDir: boolean;
	children?: TreeNode[];
}

export function buildTree(
	filesByPath: Record<string, VirtualFile>,
): TreeNode[] {
	const nodeMap = new Map<string, TreeNode>();

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

	const rootNodes: TreeNode[] = [];

	nodeMap.forEach((node) => {
		const parentPath = node.path.substring(0, node.path.lastIndexOf("/"));

		if (!parentPath) {
			rootNodes.push(node);
		} else {
			const parent = nodeMap.get(parentPath);
			if (parent?.children) {
				parent.children.push(node);
			}
		}
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

	return sortNodes(rootNodes);
}

export function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
	if (!query) return nodes;

	const filtered: TreeNode[] = [];

	for (const node of nodes) {
		if (node.isDir && node.children) {
			const filteredChildren = filterTree(node.children, query);
			if (filteredChildren.length > 0) {
				filtered.push({
					...node,
					children: filteredChildren,
				});
			}
		} else {
			const matchResult = fuzzyMatch(query, node.path);
			if (matchResult.matched) {
				filtered.push(node);
			}
		}
	}

	return filtered;
}
