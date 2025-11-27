import {
	ChevronDown,
	ChevronRight,
	FileCode2,
	FileEdit,
	FilePlus,
	FileX,
	Loader2,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFs } from "@/modules/fs/store";
import {
	areAllHunksSelected,
	areSomeHunksSelected,
	type Hunk,
	type ParsedHunks,
	parseHunksAsync,
} from "@/modules/patches/hunk";
import type { Patch } from "@/modules/patches/types";

/** Selection state for hunks: Map<fileIndex, Set<hunkIndex>> */
export type HunkSelection = Map<number, Set<number>>;

export interface DiffReviewModalProps {
	patch: Patch;
	onAccept: (
		selectedIndices?: Set<number>,
		hunkSelection?: HunkSelection,
	) => void;
	onCancel: () => void;
}

export function DiffReviewModal({
	patch,
	onAccept,
	onCancel,
}: DiffReviewModalProps) {
	const { filesByPath } = useFs();
	const [isApplying, setIsApplying] = useState(false);
	const [isParsing, setIsParsing] = useState(true);
	const [expandedIndices, setExpandedIndices] = useState<Set<number>>(
		new Set(),
	);
	const [parsedHunksMap, setParsedHunksMap] = useState<
		Map<number, ParsedHunks>
	>(new Map());
	const [hunkSelection, setHunkSelection] = useState<HunkSelection>(new Map());

	// Parse hunks asynchronously on mount
	useEffect(() => {
		let cancelled = false;

		async function parseAllHunks() {
			setIsParsing(true);
			const map = new Map<number, ParsedHunks>();
			const selection = new Map<number, Set<number>>();

			// Parse all files in parallel
			const parsePromises = patch.changes.map(async (change, i) => {
				const oldContent = filesByPath[change.path]?.content || "";
				const newContent = change.content || "";
				const parsed = await parseHunksAsync(
					oldContent,
					newContent,
					change.path,
					change.op,
				);
				return { index: i, parsed };
			});

			const results = await Promise.all(parsePromises);

			if (cancelled) return;

			for (const { index, parsed } of results) {
				map.set(index, parsed);
				// Select all hunks by default
				selection.set(index, new Set(parsed.hunks.map((h) => h.index)));
			}

			setParsedHunksMap(map);
			setHunkSelection(selection);
			setIsParsing(false);
		}

		parseAllHunks();

		return () => {
			cancelled = true;
		};
	}, [patch.changes, filesByPath]);

	// Derive file-level selection from hunk selection
	const selectedFileIndices = useMemo(() => {
		const selected = new Set<number>();
		for (const [fileIndex, hunkIndices] of hunkSelection) {
			if (hunkIndices.size > 0) {
				selected.add(fileIndex);
			}
		}
		return selected;
	}, [hunkSelection]);

	// Toggle a single hunk
	const toggleHunk = (fileIndex: number, hunkIndex: number) => {
		setHunkSelection((prev) => {
			const newSelection = new Map(prev);
			const fileHunks = new Set(prev.get(fileIndex) || []);
			if (fileHunks.has(hunkIndex)) {
				fileHunks.delete(hunkIndex);
			} else {
				fileHunks.add(hunkIndex);
			}
			newSelection.set(fileIndex, fileHunks);
			return newSelection;
		});
	};

	// Toggle all hunks in a file
	const toggleFile = (fileIndex: number) => {
		const parsed = parsedHunksMap.get(fileIndex);
		if (!parsed) return;

		setHunkSelection((prev) => {
			const newSelection = new Map(prev);
			const currentHunks = prev.get(fileIndex) || new Set();
			const allSelected = areAllHunksSelected(parsed.hunks, currentHunks);

			if (allSelected) {
				// Deselect all hunks
				newSelection.set(fileIndex, new Set());
			} else {
				// Select all hunks
				newSelection.set(fileIndex, new Set(parsed.hunks.map((h) => h.index)));
			}
			return newSelection;
		});
	};

	// Toggle all files
	const toggleAll = () => {
		const allFilesFullySelected = patch.changes.every((_, i) => {
			const parsed = parsedHunksMap.get(i);
			const selected = hunkSelection.get(i) || new Set();
			return parsed && areAllHunksSelected(parsed.hunks, selected);
		});

		if (allFilesFullySelected) {
			// Deselect all
			setHunkSelection(new Map(patch.changes.map((_, i) => [i, new Set()])));
		} else {
			// Select all
			const newSelection = new Map<number, Set<number>>();
			for (let i = 0; i < patch.changes.length; i++) {
				const parsed = parsedHunksMap.get(i);
				if (parsed) {
					newSelection.set(i, new Set(parsed.hunks.map((h) => h.index)));
				}
			}
			setHunkSelection(newSelection);
		}
	};

	const toggleExpand = (index: number) => {
		setExpandedIndices((prev) => {
			const newExpanded = new Set(prev);
			if (newExpanded.has(index)) {
				newExpanded.delete(index);
			} else {
				newExpanded.add(index);
			}
			return newExpanded;
		});
	};

	// Count total selected hunks
	const totalHunks = useMemo(() => {
		let count = 0;
		for (const parsed of parsedHunksMap.values()) {
			count += parsed.hunks.length;
		}
		return count;
	}, [parsedHunksMap]);

	const selectedHunksCount = useMemo(() => {
		let count = 0;
		for (const hunkIndices of hunkSelection.values()) {
			count += hunkIndices.size;
		}
		return count;
	}, [hunkSelection]);

	const handleAccept = async () => {
		setIsApplying(true);
		await new Promise((resolve) => setTimeout(resolve, 300));
		onAccept(selectedFileIndices, hunkSelection);
		setIsApplying(false);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<div className="w-full max-w-3xl max-h-[85vh] bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
					<div>
						<h2 className="text-base font-semibold text-neutral-100">
							Review Changes
						</h2>
						<p className="text-xs text-neutral-400 mt-0.5">{patch.summary}</p>
					</div>
					<button
						type="button"
						onClick={onCancel}
						className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
						title="Close"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto px-4 py-3">
					{isParsing ? (
						<div className="flex flex-col items-center justify-center py-12">
							<Loader2 className="h-6 w-6 text-blue-400 animate-spin mb-3" />
							<p className="text-xs text-neutral-400">Parsing changes...</p>
						</div>
					) : (
						<div className="space-y-3">
							{/* Select All Toggle */}
							<div className="flex items-center justify-between pb-2 border-b border-neutral-700/50">
								<span className="text-xs text-neutral-400">
									{selectedHunksCount} of {totalHunks} hunks selected
								</span>
								<button
									type="button"
									onClick={toggleAll}
									className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
								>
									{selectedHunksCount === totalHunks
										? "Deselect All"
										: "Select All"}
								</button>
							</div>

							{/* Individual Changes */}
							{patch.changes.map((change, fileIndex) => {
								const parsed = parsedHunksMap.get(fileIndex);
								const fileHunkSelection =
									hunkSelection.get(fileIndex) || new Set();
								const isExpanded = expandedIndices.has(fileIndex);
								const allHunksSelected = parsed
									? areAllHunksSelected(parsed.hunks, fileHunkSelection)
									: false;
								const someHunksSelected = parsed
									? areSomeHunksSelected(parsed.hunks, fileHunkSelection)
									: false;
								const hasAnySelection = fileHunkSelection.size > 0;

								let Icon = FileCode2;
								let colorClass = "text-neutral-400";
								let bgClass = "bg-neutral-500/10";
								let borderClass = "border-neutral-500/20";

								if (change.op === "create") {
									Icon = FilePlus;
									colorClass = "text-green-400";
									bgClass = "bg-green-500/10";
									borderClass = "border-green-500/20";
								} else if (change.op === "update") {
									Icon = FileEdit;
									colorClass = "text-blue-400";
									bgClass = "bg-blue-500/10";
									borderClass = "border-blue-500/20";
								} else if (change.op === "delete") {
									Icon = FileX;
									colorClass = "text-red-400";
									bgClass = "bg-red-500/10";
									borderClass = "border-red-500/20";
								}

								return (
									<div
										key={`${change.path}-${fileIndex}`}
										className={`border ${borderClass} rounded overflow-hidden ${
											!hasAnySelection ? "opacity-40" : ""
										}`}
									>
										{/* File Header */}
										<div
											className={`flex items-center gap-2 text-xs ${bgClass} px-2 py-1.5`}
										>
											<button
												type="button"
												onClick={() => toggleFile(fileIndex)}
												className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
											>
												<input
													type="checkbox"
													checked={allHunksSelected}
													ref={(el) => {
														if (el) el.indeterminate = someHunksSelected;
													}}
													onChange={() => toggleFile(fileIndex)}
													className="h-3.5 w-3.5 rounded border-neutral-600 bg-neutral-800 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
													onClick={(e) => e.stopPropagation()}
												/>
												<Icon className={`h-3 w-3 ${colorClass}`} />
												<span className="font-mono text-neutral-300 flex-1">
													{change.path}
												</span>
											</button>
											<span
												className={`text-[10px] uppercase font-medium ${colorClass}`}
											>
												{change.op}
											</span>
											{parsed && parsed.hunks.length > 1 && (
												<span className="text-[10px] text-neutral-500">
													{fileHunkSelection.size}/{parsed.hunks.length} hunks
												</span>
											)}
											<button
												type="button"
												onClick={() => toggleExpand(fileIndex)}
												className="p-0.5 hover:bg-neutral-700/50 rounded transition-colors"
												title={isExpanded ? "Collapse" : "Expand"}
											>
												{isExpanded ? (
													<ChevronDown className="h-3 w-3 text-neutral-400" />
												) : (
													<ChevronRight className="h-3 w-3 text-neutral-400" />
												)}
											</button>
										</div>

										{/* Hunks */}
										{isExpanded && parsed && (
											<div className="border-t border-neutral-700/50">
												{parsed.hunks.map((hunk) => {
													const isHunkSelected = fileHunkSelection.has(
														hunk.index,
													);
													return (
														<div
															key={`hunk-${fileIndex}-${hunk.index}`}
															className={`${!isHunkSelected ? "opacity-40" : ""}`}
														>
															{/* Hunk Header */}
															<button
																type="button"
																onClick={() =>
																	toggleHunk(fileIndex, hunk.index)
																}
																className="flex w-full items-center gap-2 px-3 py-1 bg-neutral-800/50 hover:bg-neutral-800 transition-colors text-left"
															>
																<input
																	type="checkbox"
																	checked={isHunkSelected}
																	onChange={() =>
																		toggleHunk(fileIndex, hunk.index)
																	}
																	className="h-3 w-3 rounded border-neutral-600 bg-neutral-800 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
																	onClick={(e) => e.stopPropagation()}
																/>
																<span className="font-mono text-[10px] text-neutral-500">
																	{hunk.header}
																</span>
															</button>
															{/* Hunk Diff Lines */}
															<div className="max-h-48 overflow-auto">
																<HunkDiffView hunk={hunk} />
															</div>
														</div>
													);
												})}
											</div>
										)}

										{/* Delete message */}
										{isExpanded && change.op === "delete" && (
											<div className="border-t border-neutral-700/50 px-3 py-2 text-xs text-red-400">
												This file will be deleted
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-neutral-700">
					<button
						type="button"
						onClick={onCancel}
						disabled={isApplying}
						className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleAccept}
						disabled={isApplying || isParsing || selectedHunksCount === 0}
						className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isApplying
							? "Applying..."
							: isParsing
								? "Loading..."
								: selectedHunksCount === totalHunks
									? "Accept All"
									: `Accept ${selectedHunksCount} Hunks`}
					</button>
				</div>
			</div>
		</div>
	);
}

/** Render diff lines for a single hunk */
function HunkDiffView({ hunk }: { hunk: Hunk }) {
	return (
		<div className="font-mono text-xs">
			{hunk.lines.map((line, i) => {
				const prefix = line[0];
				const content = line.substring(1);
				// Use line content hash for more stable keys
				const lineKey = `${i}-${prefix}-${content.substring(0, 20)}`;

				if (prefix === "+") {
					return (
						<div
							key={lineKey}
							className="flex bg-green-500/10 border-l-2 border-green-500"
						>
							<span className="inline-block w-8 px-1 text-right text-green-400 select-none shrink-0">
								+
							</span>
							<pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
								{content || " "}
							</pre>
						</div>
					);
				}

				if (prefix === "-") {
					return (
						<div
							key={lineKey}
							className="flex bg-red-500/10 border-l-2 border-red-500"
						>
							<span className="inline-block w-8 px-1 text-right text-red-400 select-none shrink-0">
								-
							</span>
							<pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
								{content || " "}
							</pre>
						</div>
					);
				}

				// Context line (starts with space or no prefix)
				return (
					<div key={lineKey} className="flex bg-neutral-900/30">
						<span className="inline-block w-8 px-1 text-right text-neutral-600 select-none shrink-0">
							{" "}
						</span>
						<pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all text-neutral-400">
							{prefix === " " ? content : line}
						</pre>
					</div>
				);
			})}
		</div>
	);
}
