import { useEffect, useRef } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface RevertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	filePath: string | null;
	onConfirm: () => void;
}

export function RevertDialog({
	open,
	onOpenChange,
	filePath,
	onConfirm,
}: RevertDialogProps) {
	const revertButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (open) {
			setTimeout(() => {
				revertButtonRef.current?.focus();
			}, 0);
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Revert Changes</DialogTitle>
					<DialogDescription>
						Are you sure you want to revert{" "}
						<span className="font-mono text-fg-primary">{filePath}</span>? All
						changes will be discarded.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className="px-3 py-1.5 text-sm rounded hover:bg-bg-tertiary transition-colors text-fg-muted hover:text-fg-primary"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						ref={revertButtonRef}
						className="px-3 py-1.5 text-sm rounded bg-error/10 text-error hover:bg-error/20 font-medium transition-colors"
					>
						Revert
					</button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
