import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/modules/theme/store";

export function ThemeToggle() {
	const { resolvedTheme, setMode } = useThemeStore();
	const nextMode = resolvedTheme === "dark" ? "light" : "dark";

	return (
		<TooltipProvider delayDuration={300}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						aria-label={`Switch to ${nextMode} mode`}
						className="relative text-fg-muted hover:bg-bg-tertiary hover:text-fg-primary"
						onClick={() => setMode(nextMode)}
						size="icon-sm"
						variant="ghost"
					>
						<Sun
							className={cn(
								"h-4 w-4 transition-all duration-300",
								resolvedTheme === "light"
									? "rotate-0 scale-100"
									: "absolute rotate-90 scale-0",
							)}
						/>
						<Moon
							className={cn(
								"h-4 w-4 transition-all duration-300",
								resolvedTheme === "dark"
									? "rotate-0 scale-100"
									: "absolute -rotate-90 scale-0",
							)}
						/>
					</Button>
				</TooltipTrigger>
				<TooltipContent>Switch to {nextMode} mode</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
