import {
	ChevronDownIcon,
	ChevronUpIcon,
	RotateCcwIcon,
	Undo2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentChangeSessionStore } from "@/modules/agent-chat/change-session";
import { useEditor } from "@/modules/editor/store";

interface AgentChangeToolbarProps {
	activePath: string;
	paths: string[];
}

export function AgentChangeToolbar({
	activePath,
	paths,
}: AgentChangeToolbarProps) {
	const activeIndex = paths.indexOf(activePath);
	if (activeIndex < 0) return null;
	const fileName = activePath.split("/").pop() ?? activePath;

	const openPath = (path: string) => {
		if (!useAgentChangeSessionStore.getState().setActivePath(path)) return;
		useEditor.getState().openFile(path);
	};
	const discardPath = () => {
		const session = useAgentChangeSessionStore.getState();
		const change = session.changesByPath[activePath];
		const nextPath = session.discardPath(activePath);
		if (change?.op === "create") {
			useEditor.getState().closeFile(activePath);
		}
		if (nextPath) openPath(nextPath);
	};

	return (
		<div
			aria-label="Agent change controls"
			className="agent-change-toolbar hide-scrollbar absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-xl border border-border-primary bg-bg-secondary/95 p-1.5 text-fg-primary shadow-xl backdrop-blur"
			role="toolbar"
		>
			<Button
				aria-label={`Discard changes in ${activePath}`}
				onClick={discardPath}
				size="sm"
				title={`Discard changes in ${activePath}`}
				variant="ghost"
			>
				<Undo2Icon data-icon="inline-start" />
				<span className="agent-change-action-label">Discard file</span>
			</Button>
			<div className="agent-change-divider mx-1 h-5 w-px shrink-0 bg-border-primary" />
			<Button
				aria-label="Previous modified file"
				disabled={activeIndex === 0}
				onClick={() => openPath(paths[activeIndex - 1])}
				size="icon-sm"
				variant="ghost"
			>
				<ChevronUpIcon />
			</Button>
			<Button
				aria-label={`Open modified file ${activePath}`}
				className="agent-change-current min-w-24 gap-1.5 px-2"
				onClick={() => openPath(activePath)}
				size="sm"
				title={activePath}
				variant="ghost"
			>
				<span className="agent-change-file-name max-w-28 truncate font-mono text-xs">
					{fileName}
				</span>
				<span className="text-xs text-fg-secondary">
					{activeIndex + 1} of {paths.length}
				</span>
			</Button>
			<Button
				aria-label="Next modified file"
				disabled={activeIndex === paths.length - 1}
				onClick={() => openPath(paths[activeIndex + 1])}
				size="icon-sm"
				variant="ghost"
			>
				<ChevronDownIcon />
			</Button>
			<div className="agent-change-divider mx-1 h-5 w-px shrink-0 bg-border-primary" />
			<Button
				aria-label="Discard all Agent changes"
				onClick={() =>
					useAgentChangeSessionStore.getState().requestDiscardAll()
				}
				size="sm"
				title="Discard all Agent changes"
				variant="ghost"
			>
				<RotateCcwIcon data-icon="inline-start" />
				<span className="agent-change-action-label">Discard all</span>
			</Button>
		</div>
	);
}
