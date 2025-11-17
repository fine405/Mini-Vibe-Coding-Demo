import { useState } from "react";
import { X, FileCode2, FilePlus, FileEdit, FileX } from "lucide-react";
import type { Patch } from "../patches/types";
import { previewPatch } from "../patches/apply";

interface DiffReviewModalProps {
	patch: Patch;
	onAccept: () => void;
	onCancel: () => void;
}

export function DiffReviewModal({
	patch,
	onAccept,
	onCancel,
}: DiffReviewModalProps) {
	const [isApplying, setIsApplying] = useState(false);
	const preview = previewPatch(patch);

	const handleAccept = async () => {
		setIsApplying(true);
		// Small delay for UX
		await new Promise((resolve) => setTimeout(resolve, 300));
		onAccept();
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
						{/* Creates */}
						{preview.creates.length > 0 && (
							<div>
								<div className="flex items-center gap-2 text-xs font-medium text-green-400 mb-2">
									<FilePlus className="h-3.5 w-3.5" />
									<span>New Files ({preview.creates.length})</span>
								</div>
								<ul className="space-y-1">
									{preview.creates.map((path) => (
										<li
											key={path}
											className="flex items-center gap-2 text-xs text-neutral-300 bg-green-500/10 border border-green-500/20 rounded px-2 py-1.5"
										>
											<FileCode2 className="h-3 w-3 text-green-400" />
											<span className="font-mono">{path}</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{/* Updates */}
						{preview.updates.length > 0 && (
							<div>
								<div className="flex items-center gap-2 text-xs font-medium text-blue-400 mb-2">
									<FileEdit className="h-3.5 w-3.5" />
									<span>Modified Files ({preview.updates.length})</span>
								</div>
								<ul className="space-y-1">
									{preview.updates.map((path) => (
										<li
											key={path}
											className="flex items-center gap-2 text-xs text-neutral-300 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1.5"
										>
											<FileCode2 className="h-3 w-3 text-blue-400" />
											<span className="font-mono">{path}</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{/* Deletes */}
						{preview.deletes.length > 0 && (
							<div>
								<div className="flex items-center gap-2 text-xs font-medium text-red-400 mb-2">
									<FileX className="h-3.5 w-3.5" />
									<span>Deleted Files ({preview.deletes.length})</span>
								</div>
								<ul className="space-y-1">
									{preview.deletes.map((path) => (
										<li
											key={path}
											className="flex items-center gap-2 text-xs text-neutral-300 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5"
										>
											<FileCode2 className="h-3 w-3 text-red-400" />
											<span className="font-mono">{path}</span>
										</li>
									))}
								</ul>
							</div>
						)}
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
