import { type Change, diffLines } from "diff";
import { useMemo } from "react";

interface DiffViewerProps {
	oldContent: string;
	newContent: string;
	fileName?: string;
	language?: string;
}

export function DiffViewer({
	oldContent,
	newContent,
	fileName,
}: DiffViewerProps) {
	const changes = useMemo(() => {
		return diffLines(oldContent || "", newContent || "");
	}, [oldContent, newContent]);

	return (
		<div className="w-full h-full bg-neutral-950 text-neutral-100 overflow-auto">
			{fileName && (
				<div className="sticky top-0 z-10 px-3 py-2 text-xs font-medium text-neutral-400 bg-neutral-900 border-b border-neutral-800">
					{fileName}
				</div>
			)}
			<div className="font-mono text-xs">
				{changes.map((change, index) => (
					<DiffLine
						key={`${index}-${change.added ? "add" : change.removed ? "del" : "unc"}`}
						change={change}
					/>
				))}
			</div>
		</div>
	);
}

function DiffLine({ change }: { change: Change }) {
	const lines = change.value.split("\n");
	// Remove last empty line if exists
	if (lines[lines.length - 1] === "") {
		lines.pop();
	}

	if (change.added) {
		return (
			<>
				{lines.map((line, i) => (
					<div
						key={`add-${i}-${line.substring(0, 20)}`}
						className="flex bg-green-500/10 border-l-2 border-green-500"
					>
						<span className="inline-block w-12 px-2 text-right text-neutral-600 select-none shrink-0">
							{/* Line number placeholder for added lines */}
						</span>
						<span className="inline-block w-12 px-2 text-right text-green-400 select-none shrink-0">
							+
						</span>
						<pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
							{line || " "}
						</pre>
					</div>
				))}
			</>
		);
	}

	if (change.removed) {
		return (
			<>
				{lines.map((line, i) => (
					<div
						key={`del-${i}-${line.substring(0, 20)}`}
						className="flex bg-red-500/10 border-l-2 border-red-500"
					>
						<span className="inline-block w-12 px-2 text-right text-red-400 select-none shrink-0">
							-
						</span>
						<span className="inline-block w-12 px-2 text-right text-neutral-600 select-none shrink-0">
							{/* Line number placeholder for removed lines */}
						</span>
						<pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
							{line || " "}
						</pre>
					</div>
				))}
			</>
		);
	}

	// Unchanged lines
	return (
		<>
			{lines.map((line, i) => (
				<div
					key={`unc-${i}-${line.substring(0, 20)}`}
					className="flex bg-neutral-900/30"
				>
					<span className="inline-block w-12 px-2 text-right text-neutral-600 select-none shrink-0">
						{/* Line number */}
					</span>
					<span className="inline-block w-12 px-2 text-right text-neutral-600 select-none shrink-0">
						{/* Line number */}
					</span>
					<pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all text-neutral-400">
						{line || " "}
					</pre>
				</div>
			))}
		</>
	);
}
