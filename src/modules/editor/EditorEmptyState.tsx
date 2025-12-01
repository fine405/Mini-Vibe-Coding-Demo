import { Command, FileCode2, FolderOpen, Keyboard } from "lucide-react";

export function EditorEmptyState() {
	return (
		<div className="h-full w-full flex flex-col bg-bg-primary text-fg-primary">
			<div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-secondary border-b border-border-primary">
				Editor
			</div>
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center max-w-xs">
					<div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-accent/10 to-purple-500/10 flex items-center justify-center">
						<FileCode2 className="h-8 w-8 text-accent/60" />
					</div>
					<h3 className="text-sm font-medium text-fg-primary mb-1">
						No file open
					</h3>
					<p className="text-xs text-fg-muted mb-6">
						Select a file from the tree or use quick actions below
					</p>
					<div className="space-y-2">
						<QuickAction
							icon={<FolderOpen className="h-4 w-4" />}
							title="Open from File Tree"
							description="Click any file in the left panel"
						/>
						<QuickAction
							icon={<Command className="h-4 w-4" />}
							title="Quick Open"
							description={
								<>
									Press{" "}
									<kbd className="px-1 py-0.5 rounded bg-bg-tertiary text-fg-secondary font-mono">
										⌘P
									</kbd>{" "}
									to search files
								</>
							}
						/>
						<QuickAction
							icon={<Keyboard className="h-4 w-4" />}
							title="Command Palette"
							description={
								<>
									Press{" "}
									<kbd className="px-1 py-0.5 rounded bg-bg-tertiary text-fg-secondary font-mono">
										⌘K
									</kbd>{" "}
									for all commands
								</>
							}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

interface QuickActionProps {
	icon: React.ReactNode;
	title: string;
	description: React.ReactNode;
}

function QuickAction({ icon, title, description }: QuickActionProps) {
	return (
		<div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-secondary border border-border-primary text-left">
			<div className="text-fg-muted shrink-0">{icon}</div>
			<div className="flex-1 min-w-0">
				<p className="text-xs font-medium text-fg-secondary">{title}</p>
				<p className="text-[10px] text-fg-muted">{description}</p>
			</div>
		</div>
	);
}
