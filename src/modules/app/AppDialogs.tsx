import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ProjectController } from "@/modules/app/use-project-controller";

export function AppDialogs({ controller }: { controller: ProjectController }) {
	return (
		<>
			<Dialog
				onOpenChange={controller.setNewProjectDialogOpen}
				open={controller.newProjectDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Start New Project</DialogTitle>
						<DialogDescription>
							This will clear all current files and storage. This action cannot
							be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							onClick={() => controller.setNewProjectDialogOpen(false)}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							onClick={controller.confirmNewProject}
							variant="destructive"
						>
							Start New Project
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				onOpenChange={controller.setExportDialogOpen}
				open={controller.exportDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Export Project</DialogTitle>
						<DialogDescription>
							Enter a name for your {controller.exportFormat.toUpperCase()}{" "}
							export.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Input
							autoFocus
							onChange={(event) =>
								controller.setExportProjectName(event.target.value)
							}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									void controller.confirmExportProject();
								}
							}}
							placeholder="my-project"
							value={controller.exportProjectName}
						/>
					</div>
					<DialogFooter>
						<Button
							onClick={() => controller.setExportDialogOpen(false)}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={!controller.exportProjectName.trim()}
							onClick={() => void controller.confirmExportProject()}
						>
							Export
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				onOpenChange={controller.setRevertAllDialogOpen}
				open={controller.revertAllDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Revert All Changes</DialogTitle>
						<DialogDescription>
							This will discard changes in{" "}
							<span className="font-semibold text-fg-primary">
								{controller.modifiedFileCount} file(s)
							</span>
							. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							onClick={() => controller.setRevertAllDialogOpen(false)}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							className="bg-warning text-white hover:bg-warning/90"
							onClick={controller.confirmRevertAll}
						>
							Revert All
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
