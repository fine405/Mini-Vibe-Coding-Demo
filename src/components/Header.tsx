import { clsx } from "clsx";
import { MessageSquare, TerminalSquare } from "lucide-react";
import { useLayoutStore } from "@/modules/layout/store";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

export function Header() {
	const { showChat, showConsole, toggleChat, toggleConsole } = useLayoutStore();

	return (
		<div className="h-10 w-full bg-neutral-950 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0">
			<div className="flex items-center gap-2">
				<span className="text-sm font-semibold text-neutral-300">
					Mini Lovable
				</span>
			</div>

			<div className="flex items-center gap-1">
				<TooltipProvider delayDuration={300}>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								onClick={toggleChat}
								className={clsx(
									"p-1.5 rounded hover:bg-neutral-800 transition-colors",
									showChat ? "text-neutral-200" : "text-neutral-500",
								)}
							>
								<MessageSquare className="h-4 w-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent>Toggle Chat Panel</TooltipContent>
					</Tooltip>

					<div className="w-px h-4 bg-neutral-800 mx-1" />

					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								onClick={toggleConsole}
								className={clsx(
									"p-1.5 rounded hover:bg-neutral-800 transition-colors",
									showConsole ? "text-neutral-200" : "text-neutral-500",
								)}
							>
								<TerminalSquare className="h-4 w-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent>Toggle Console Panel</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	);
}
