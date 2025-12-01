import {
	Check,
	ChevronDown,
	ChevronRight,
	Eye,
	FileCode2,
	FileEdit,
	FilePlus,
	FileX,
	Loader2,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFs } from "@/modules/fs/store";
import { type ParsedHunks, parseHunksAsync } from "@/modules/patches/hunk";
import type { Patch } from "@/modules/patches/types";
import { type HunkSelection, useChatStore } from "./store";

interface InlineDiffPreviewProps {
	patch: Patch;
	messageId: string;
	onAccept: (hunkSelection: HunkSelection) => void;
	onReject: () => void;
	onViewDiff: (fileIndex: number) => void;
}

interface FileStats {
	added: number;
	removed: number;
}

export function InlineDiffPreview({
	patch,
	messageId,
	onAccept,
	onReject,
	onViewDiff,
}: InlineDiffPreviewProps) {
	const { filesByPath } = useFs();
	const { pendingChange, updateFileSelection, setPendingChange } =
		useChatStore();
	const [isParsing, setIsParsing] = useState(true);
	const [parsedHunksMap, setParsedHunksMap] = useState<
		Map<number, ParsedHunks>
	>(new Map());
	const [fileStats, setFileStats] = useState<Map<number, FileStats>>(new Map());
	const [expandedFiles, setExpandedFiles] = useState<Set<number>>(new Set());

	// Parse hunks and initialize pending change on mount
	useEffect(() => {
		let cancelled = false;

		async function parseAllHunks() {
			setIsParsing(true);
			const map = new Map<number, ParsedHunks>();
			const stats = new Map<number, FileStats>();
			const fileSelections = new Map<number, boolean>();
			const hunkSelections: HunkSelection = new Map();

			const parsePromises = patch.changes.map(async (change, i) => {
				const oldContent = filesByPath[change.path]?.content || "";
				const newContent = change.content || "";
				const parsed = await parseHunksAsync(
					oldContent,
					newContent,
					change.path,
					change.op,
				);

				// Calculate stats
				let added = 0;
				let removed = 0;
				for (const hunk of parsed.hunks) {
					for (const line of hunk.lines) {
						if (line.startsWith("+")) added++;
						else if (line.startsWith("-")) removed++;
					}
				}

				return { index: i, parsed, stats: { added, removed } };
			});

			const results = await Promise.all(parsePromises);

			if (cancelled) return;

			for (const { index, parsed, stats: fileStatResult } of results) {
				map.set(index, parsed);
				stats.set(index, fileStatResult);
				// Select all files and hunks by default
				fileSelections.set(index, true);
				hunkSelections.set(index, new Set(parsed.hunks.map((h) => h.index)));
			}

			setParsedHunksMap(map);
			setFileStats(stats);

			// Initialize pending change in store
			setPendingChange({
				messageId,
				patch,
				fileSelections,
				hunkSelections,
				status: "pending",
			});

			setIsParsing(false);
		}

		parseAllHunks();

		return () => {
			cancelled = true;
		};
	}, [patch, filesByPath, messageId, setPendingChange]);

	// Get current selections from store
	const fileSelections = pendingChange?.fileSelections || new Map();
	const hunkSelections = pendingChange?.hunkSelections || new Map();

	const selectedFilesCount = useMemo(() => {
		let count = 0;
		for (const selected of fileSelections.values()) {
			if (selected) count++;
		}
		return count;
	}, [fileSelections]);

	const totalHunksCount = useMemo(() => {
		let count = 0;
		for (const parsed of parsedHunksMap.values()) {
			count += parsed.hunks.length;
		}
		return count;
	}, [parsedHunksMap]);

	const selectedHunksCount = useMemo(() => {
		let count = 0;
		for (const hunks of hunkSelections.values()) {
			count += hunks.size;
		}
		return count;
	}, [hunkSelections]);

	const toggleFileExpand = (index: number) => {
		setExpandedFiles((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	};

	const handleAccept = () => {
		onAccept(hunkSelections);
	};

	if (isParsing) {
		return (
			<div className="mt-2 p-3 bg-bg-secondary border border-border-primary rounded-lg">
				<div className="flex items-center gap-2 text-xs text-fg-muted">
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
					<span>Parsing changes...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="mt-2 bg-bg-secondary border border-border-primary rounded-lg overflow-hidden w-full max-w-full">
			{/* Header */}
			<div className="px-3 py-2 border-b border-border-primary flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FileCode2 className="h-3.5 w-3.5 text-fg-muted" />
					<span className="text-xs font-medium text-fg-primary">
						{patch.changes.length} file{patch.changes.length !== 1 ? "s" : ""}{" "}
						changed
					</span>
				</div>
				<span className="text-[10px] text-fg-muted">
					{selectedHunksCount}/{totalHunksCount} hunks selected
				</span>
			</div>

			{/* File List */}
			<div className="divide-y divide-border-primary overflow-hidden">
				{patch.changes.map((change, fileIndex) => {
					const isSelected = fileSelections.get(fileIndex) ?? true;
					const stats = fileStats.get(fileIndex) || { added: 0, removed: 0 };
					const isExpanded = expandedFiles.has(fileIndex);

					let Icon = FileCode2;
					let colorClass = "text-fg-muted";

					if (change.op === "create") {
						Icon = FilePlus;
						colorClass = "text-success";
					} else if (change.op === "update") {
						Icon = FileEdit;
						colorClass = "text-accent";
					} else if (change.op === "delete") {
						Icon = FileX;
						colorClass = "text-error";
					}

					return (
						<div
							key={`${change.path}-${fileIndex}`}
							className={`overflow-hidden ${!isSelected ? "opacity-50" : ""}`}
						>
							<div className="px-3 py-2 flex items-center gap-2 hover:bg-bg-tertiary transition-colors overflow-hidden">
								{/* Checkbox */}
								<input
									type="checkbox"
									checked={isSelected}
									onChange={(e) => {
										const hunkCount =
											parsedHunksMap.get(fileIndex)?.hunks.length || 0;
										updateFileSelection(fileIndex, e.target.checked, hunkCount);
									}}
									className="h-3.5 w-3.5 shrink-0 rounded border-border-primary bg-bg-primary text-accent focus:ring-1 focus:ring-accent cursor-pointer"
								/>

								{/* Expand toggle */}
								<button
									type="button"
									onClick={() => toggleFileExpand(fileIndex)}
									className="p-0.5 shrink-0 hover:bg-bg-tertiary rounded"
								>
									{isExpanded ? (
										<ChevronDown className="h-3 w-3 text-fg-muted" />
									) : (
										<ChevronRight className="h-3 w-3 text-fg-muted" />
									)}
								</button>

								{/* File icon and name */}
								<Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} />
								<span
									className="flex-1 text-xs font-mono text-fg-secondary truncate min-w-0"
									title={change.path}
								>
									{change.path.split("/").pop()}
								</span>

								{/* Stats */}
								<div className="flex items-center gap-1.5 text-[10px] shrink-0">
									{stats.added > 0 && (
										<span className="text-success">+{stats.added}</span>
									)}
									{stats.removed > 0 && (
										<span className="text-error">-{stats.removed}</span>
									)}
								</div>

								{/* View Diff button */}
								<button
									type="button"
									onClick={() => onViewDiff(fileIndex)}
									className="p-1 hover:bg-bg-tertiary rounded text-fg-muted hover:text-fg-primary transition-colors shrink-0"
									title="View Diff"
								>
									<Eye className="h-3 w-3" />
								</button>
							</div>

							{/* Expanded hunk preview */}
							{isExpanded && (
								<div className="px-3 pb-2">
									<div className="text-[10px] text-fg-muted bg-bg-tertiary rounded p-2 font-mono max-h-32 overflow-auto">
										{parsedHunksMap.get(fileIndex)?.hunks.map((hunk) => (
											<div key={hunk.index} className="mb-1 last:mb-0">
												<div className="text-fg-muted">{hunk.header}</div>
												{hunk.lines.slice(0, 5).map((line, i) => {
													const prefix = line[0];
													let lineClass = "text-fg-muted";
													if (prefix === "+") lineClass = "text-success";
													else if (prefix === "-") lineClass = "text-error";
													const lineKey = `${hunk.index}-${i}-${prefix}`;
													return (
														<div key={lineKey} className={lineClass}>
															{line}
														</div>
													);
												})}
												{hunk.lines.length > 5 && (
													<div className="text-fg-muted">
														... {hunk.lines.length - 5} more lines
													</div>
												)}
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Actions */}
			<div className="px-3 py-2 border-t border-border-primary flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={onReject}
					className="px-2.5 py-1 text-xs font-medium text-fg-secondary hover:text-fg-primary bg-bg-tertiary hover:bg-bg-secondary border border-border-primary rounded transition-colors flex items-center gap-1"
				>
					<X className="h-3 w-3" />
					Reject All
				</button>
				<button
					type="button"
					onClick={handleAccept}
					disabled={selectedFilesCount === 0}
					className="px-2.5 py-1 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<Check className="h-3 w-3" />
					{selectedFilesCount === patch.changes.length
						? "Accept All"
						: `Accept ${selectedFilesCount} File${selectedFilesCount !== 1 ? "s" : ""}`}
				</button>
			</div>
		</div>
	);
}
