import { FileCode2, FileEdit, FilePlus, FileX, X } from "lucide-react";
import { useState } from "react";
import type { Patch } from "@/modules/patches/types";

interface DiffReviewModalProps {
	patch: Patch;
	onAccept: (selectedIndices?: Set<number>) => void;
	onCancel: () => void;
}

export function DiffReviewModal({
	patch,
	onAccept,
	onCancel,
}: DiffReviewModalProps) {
	const [isApplying, setIsApplying] = useState(false);
	const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
		new Set(patch.changes.map((_, i) => i)),
	);

	const toggleChange = (index: number) => {
		const newSelected = new Set(selectedIndices);
		if (newSelected.has(index)) {
			newSelected.delete(index);
		} else {
			newSelected.add(index);
		}
		setSelectedIndices(newSelected);
	};

	const toggleAll = () => {
		if (selectedIndices.size === patch.changes.length) {
			setSelectedIndices(new Set());
		} else {
			setSelectedIndices(new Set(patch.changes.map((_, i) => i)));
		}
	};

	const handleAccept = async () => {
		setIsApplying(true);
		// Small delay for UX
		await new Promise((resolve) => setTimeout(resolve, 300));
		onAccept(selectedIndices);
		setIsApplying(false);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<div className="w-full max-w-2xl max-h-[80vh] bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl flex flex-col">
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
					<div className="space-y-3">
						{/* Select All Toggle */}
						<div className="flex items-center justify-between pb-2 border-b border-neutral-700/50">
							<span className="text-xs text-neutral-400">
								{selectedIndices.size} of {patch.changes.length} changes
								selected
							</span>
							<button
								type="button"
								onClick={toggleAll}
								className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
							>
								{selectedIndices.size === patch.changes.length
									? "Deselect All"
									: "Select All"}
							</button>
						</div>

						{/* Individual Changes */}
						{patch.changes.map((change, index) => {
							const isSelected = selectedIndices.has(index);
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
								// biome-ignore lint/a11y/useSemanticElements: <explanation>
								<div
									key={`${change.path}-${index}`}
									className={`flex items-center gap-2 text-xs ${bgClass} border ${borderClass} rounded px-2 py-1.5 cursor-pointer hover:opacity-80 transition-opacity ${
										!isSelected ? "opacity-40" : ""
									}`}
									onClick={() => toggleChange(index)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											toggleChange(index);
										}
									}}
									role="button"
									tabIndex={0}
								>
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => toggleChange(index)}
										className="h-3.5 w-3.5 rounded border-neutral-600 bg-neutral-800 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
										onClick={(e) => e.stopPropagation()}
									/>
									<Icon className={`h-3 w-3 ${colorClass}`} />
									<span className="font-mono text-neutral-300 flex-1">
										{change.path}
									</span>
									<span
										className={`text-[10px] uppercase font-medium ${colorClass}`}
									>
										{change.op}
									</span>
								</div>
							);
						})}
					</div>
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
						disabled={isApplying}
						className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isApplying ? "Applying..." : "Accept All"}
					</button>
				</div>
			</div>
		</div>
	);
}
