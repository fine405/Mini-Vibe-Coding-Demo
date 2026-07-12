import {
	CheckCircle2Icon,
	ChevronDownIcon,
	FileDiffIcon,
	RotateCcwIcon,
	XCircleIcon,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
	selectAllChangeHunks,
	toWorkspaceChangeSelection,
} from "@/modules/agent-chat/review-selection";
import { getLanguageFromPath } from "@/modules/editor/language";
import type { ParsedHunks } from "@/modules/patches/hunk";
import {
	browserWorkspace,
	readBrowserWorkspaceFiles,
} from "@/modules/workspace/browser";
import { loadWorkspaceChangeHunks } from "@/modules/workspace/hunk-selection";
import type {
	WorkspaceChange,
	WorkspaceChangeSet,
} from "@/modules/workspace/types";

const EditorDiffView = lazy(async () => ({
	default: (await import("@/modules/editor/EditorDiffView")).EditorDiffView,
}));

interface ReviewData {
	hunks: ParsedHunks[];
	selections: Map<number, Set<number>>;
}

interface ChangeSetReviewProps {
	changeSet: WorkspaceChangeSet;
	onRegenerate?(): void;
}

type ReviewStatus = "pending" | "applying" | "applied" | "rejected";

function countHunkLines(
	hunks: ParsedHunks["hunks"],
	selected: ReadonlySet<number>,
) {
	let additions = 0;
	let deletions = 0;
	for (const hunk of hunks) {
		if (!selected.has(hunk.index)) continue;
		for (const line of hunk.lines) {
			if (line.startsWith("+") && !line.startsWith("+++")) additions += 1;
			if (line.startsWith("-") && !line.startsWith("---")) deletions += 1;
		}
	}
	return { additions, deletions };
}

function cloneSelections(
	selections: Map<number, Set<number>>,
): Map<number, Set<number>> {
	return new Map(
		[...selections].map(([index, selected]) => [index, new Set(selected)]),
	);
}

function FileChangeReview({
	change,
	fileIndex,
	parsed,
	selected,
	disabled,
	onToggleFile,
	onToggleHunk,
	onOpenDetail,
}: {
	change: WorkspaceChange;
	fileIndex: number;
	parsed: ParsedHunks;
	selected: ReadonlySet<number>;
	disabled: boolean;
	onToggleFile(fileIndex: number, checked: boolean): void;
	onToggleHunk(fileIndex: number, hunkIndex: number, checked: boolean): void;
	onOpenDetail(fileIndex: number): void;
}) {
	const [open, setOpen] = useState(fileIndex === 0);
	const allSelected =
		parsed.hunks.length > 0 && selected.size === parsed.hunks.length;
	const someSelected = selected.size > 0 && !allSelected;
	const stats = countHunkLines(parsed.hunks, selected);

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<div className="overflow-hidden rounded-lg border bg-background/60">
				<div className="flex items-center gap-2 p-2.5">
					<Checkbox
						aria-label={`Select all changes in ${change.path}`}
						checked={someSelected ? "indeterminate" : allSelected}
						disabled={disabled || parsed.hunks.length === 0}
						onCheckedChange={(checked) =>
							onToggleFile(fileIndex, checked === true)
						}
					/>
					<CollapsibleTrigger asChild>
						<Button
							className="min-w-0 flex-1 justify-start px-1"
							size="sm"
							variant="ghost"
						>
							<ChevronDownIcon
								className={cn(
									"size-3.5 shrink-0 transition-transform",
									open ? "rotate-0" : "-rotate-90",
								)}
							/>
							<span className="truncate font-mono text-xs">{change.path}</span>
						</Button>
					</CollapsibleTrigger>
					<Badge variant="outline">{change.op}</Badge>
					<span className="whitespace-nowrap text-xs">
						<span className="text-emerald-500">+{stats.additions}</span>{" "}
						<span className="text-red-500">-{stats.deletions}</span>
					</span>
					<Button
						aria-label={`Open full diff for ${change.path}`}
						onClick={() => onOpenDetail(fileIndex)}
						size="icon-sm"
						variant="ghost"
					>
						<FileDiffIcon />
					</Button>
				</div>
				<CollapsibleContent>
					<div className="space-y-2 border-t p-2.5">
						{parsed.hunks.map((hunk) => (
							<div
								className="overflow-hidden rounded-md border"
								key={hunk.index}
							>
								<div className="flex items-center gap-2 border-b bg-muted/40 px-2 py-1.5 text-xs">
									<Checkbox
										aria-label={`Select hunk ${hunk.index + 1} in ${change.path}`}
										checked={selected.has(hunk.index)}
										disabled={disabled}
										onCheckedChange={(checked) =>
											onToggleHunk(fileIndex, hunk.index, checked === true)
										}
									/>
									<span className="font-mono text-muted-foreground">
										{hunk.header}
									</span>
								</div>
								<pre className="max-h-56 overflow-auto bg-muted/20 py-1 text-[11px] leading-5">
									{hunk.lines.map((line, lineIndex) => (
										<div
											className={cn(
												"px-2 font-mono",
												line.startsWith("+") &&
													"bg-emerald-500/10 text-emerald-600",
												line.startsWith("-") && "bg-red-500/10 text-red-600",
											)}
											key={`${hunk.index}:${lineIndex}`}
										>
											{line || " "}
										</div>
									))}
								</pre>
							</div>
						))}
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}

export function ChangeSetReview({
	changeSet,
	onRegenerate,
}: ChangeSetReviewProps) {
	const [sourceFiles] = useState(readBrowserWorkspaceFiles);
	const [review, setReview] = useState<ReviewData | null>(null);
	const [status, setStatus] = useState<ReviewStatus>("pending");
	const [transactionId, setTransactionId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [hasConflict, setHasConflict] = useState(false);
	const [detailIndex, setDetailIndex] = useState<number | null>(null);

	useEffect(() => {
		let active = true;
		void loadWorkspaceChangeHunks(changeSet, sourceFiles)
			.then((hunks) => {
				if (!active) return;
				setReview({ hunks, selections: selectAllChangeHunks(hunks) });
			})
			.catch((loadError: unknown) => {
				if (!active) return;
				setError(
					loadError instanceof Error
						? loadError.message
						: "Could not prepare the change review",
				);
			});
		return () => {
			active = false;
		};
	}, [changeSet, sourceFiles]);

	const totals = useMemo(() => {
		if (!review) return { files: 0, hunks: 0, additions: 0, deletions: 0 };
		let files = 0;
		let hunks = 0;
		let additions = 0;
		let deletions = 0;
		for (let index = 0; index < review.hunks.length; index += 1) {
			const selected = review.selections.get(index) ?? new Set<number>();
			if (selected.size > 0) files += 1;
			hunks += selected.size;
			const stats = countHunkLines(review.hunks[index].hunks, selected);
			additions += stats.additions;
			deletions += stats.deletions;
		}
		return { files, hunks, additions, deletions };
	}, [review]);

	const updateSelections = (
		updater: (selections: Map<number, Set<number>>) => void,
	) => {
		setReview((current) => {
			if (!current) return current;
			const selections = cloneSelections(current.selections);
			updater(selections);
			return { ...current, selections };
		});
	};
	const toggleFile = (fileIndex: number, checked: boolean) => {
		if (!review) return;
		updateSelections((selections) => {
			selections.set(
				fileIndex,
				checked
					? new Set(review.hunks[fileIndex].hunks.map((hunk) => hunk.index))
					: new Set(),
			);
		});
	};
	const toggleHunk = (
		fileIndex: number,
		hunkIndex: number,
		checked: boolean,
	) => {
		updateSelections((selections) => {
			const selected = selections.get(fileIndex) ?? new Set<number>();
			if (checked) selected.add(hunkIndex);
			else selected.delete(hunkIndex);
			selections.set(fileIndex, selected);
		});
	};

	const apply = async () => {
		if (!review || totals.hunks === 0 || status !== "pending") return;
		setStatus("applying");
		setError(null);
		setHasConflict(false);
		try {
			const result = await browserWorkspace.apply(
				changeSet,
				toWorkspaceChangeSelection(review.selections),
			);
			if (!result.ok) {
				setStatus("pending");
				setError(`${result.code}: ${result.message}`);
				setHasConflict(
					result.code === "HASH_CONFLICT" ||
						result.code === "PATH_CONFLICT" ||
						result.code === "STALE_REVISION",
				);
				return;
			}
			setTransactionId(result.transactionId);
			setStatus("applied");
			toast.success(`Applied ${result.affectedPaths.length} file change(s)`);
		} catch (applyError) {
			setStatus("pending");
			setError(
				applyError instanceof Error
					? applyError.message
					: "The selected changes could not be applied",
			);
		}
	};
	const reject = () => {
		setError(null);
		setHasConflict(false);
		setStatus("rejected");
	};
	const undo = async () => {
		if (!transactionId) return;
		const result = await browserWorkspace.undo(transactionId);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		setTransactionId(null);
		setStatus("pending");
		setHasConflict(false);
		toast.success("Agent changes were undone");
	};

	const detailChange =
		detailIndex === null ? null : changeSet.changes[detailIndex];

	if (status === "rejected") {
		return (
			<div className="space-y-2 rounded-xl border bg-card p-3 text-card-foreground">
				<div className="flex items-center justify-between gap-3">
					<p className="min-w-0 truncate text-sm font-medium">
						{changeSet.summary}
					</p>
					<Badge variant="secondary">Rejected</Badge>
				</div>
				<p className="text-xs text-muted-foreground">
					Proposal discarded; no files changed.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3 rounded-xl border bg-card p-3 text-card-foreground">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<FileDiffIcon className="size-4 text-primary" />
						<p className="font-medium text-sm">Workspace change proposal</p>
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						{changeSet.summary}
					</p>
				</div>
				{status === "applied" && <Badge>Applied</Badge>}
			</div>

			{changeSet.changes.length === 0 ? (
				<p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
					The agent finalized without changing workspace files.
				</p>
			) : review ? (
				<div className="space-y-2">
					{changeSet.changes.map((change, index) => (
						<FileChangeReview
							change={change}
							disabled={status !== "pending"}
							fileIndex={index}
							key={`${change.op}:${change.path}`}
							onOpenDetail={setDetailIndex}
							onToggleFile={toggleFile}
							onToggleHunk={toggleHunk}
							parsed={review.hunks[index]}
							selected={review.selections.get(index) ?? new Set()}
						/>
					))}
				</div>
			) : (
				<p className="text-xs text-muted-foreground">Preparing diff review…</p>
			)}

			{error && (
				<div className="space-y-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
					<p>{error}</p>
					{hasConflict && onRegenerate && (
						<Button
							onClick={() => {
								setStatus("rejected");
								onRegenerate();
							}}
							size="xs"
							variant="outline"
						>
							<RotateCcwIcon data-icon="inline-start" />
							Regenerate from current workspace
						</Button>
					)}
				</div>
			)}

			{changeSet.changes.length > 0 && (
				<div className="flex flex-wrap items-center gap-2 border-t pt-3">
					<span className="mr-auto text-xs text-muted-foreground">
						{totals.files} files · {totals.hunks} hunks ·{" "}
						<span className="text-emerald-500">+{totals.additions}</span>{" "}
						<span className="text-red-500">-{totals.deletions}</span>
					</span>
					{status === "applied" ? (
						<Button onClick={() => void undo()} size="sm" variant="outline">
							<RotateCcwIcon data-icon="inline-start" />
							Undo
						</Button>
					) : (
						<>
							<Button
								disabled={status === "applying"}
								onClick={reject}
								size="sm"
								variant="outline"
							>
								<XCircleIcon data-icon="inline-start" />
								Reject
							</Button>
							<Button
								disabled={
									!review || totals.hunks === 0 || status === "applying"
								}
								onClick={() => void apply()}
								size="sm"
							>
								<CheckCircle2Icon data-icon="inline-start" />
								{status === "applying" ? "Applying…" : "Apply selected"}
							</Button>
						</>
					)}
				</div>
			)}

			<Dialog
				onOpenChange={(open) => {
					if (!open) setDetailIndex(null);
				}}
				open={detailIndex !== null}
			>
				<DialogContent className="h-[80vh] w-[90vw] max-w-[90vw] grid-rows-[auto_1fr] sm:max-w-[90vw]">
					<DialogHeader>
						<DialogTitle className="font-mono text-sm">
							{detailChange?.path ?? "File diff"}
						</DialogTitle>
					</DialogHeader>
					<div className="min-h-0 overflow-hidden rounded-md border">
						{detailChange && (
							<Suspense
								fallback={
									<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
										Loading diff…
									</div>
								}
							>
								<EditorDiffView
									language={getLanguageFromPath(detailChange.path)}
									modifiedContent={
										detailChange.op === "delete" ? "" : detailChange.content
									}
									originalContent={sourceFiles[detailChange.path] ?? ""}
								/>
							</Suspense>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
