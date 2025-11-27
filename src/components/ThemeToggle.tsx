import { Laptop, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/modules/theme/store";
import type { ThemeMode } from "@/modules/theme/types";

const MODE_SEQUENCE: ThemeMode[] = ["light", "dark", "auto"];
const MODE_LABELS: Record<ThemeMode, string> = {
	light: "Light",
	dark: "Dark",
	auto: "Auto",
};
const MODE_ICONS: Record<ThemeMode, ReactNode> = {
	light: <Sun className="h-4 w-4" />,
	dark: <Moon className="h-4 w-4" />,
	auto: <Laptop className="h-4 w-4" />,
};

export function ThemeToggle() {
	const { mode, setMode } = useThemeStore();
	const nextMode =
		MODE_SEQUENCE[(MODE_SEQUENCE.indexOf(mode) + 1) % MODE_SEQUENCE.length];

	return (
		<button
			type="button"
			onClick={() => setMode(nextMode)}
			className="relative flex h-9 w-9 items-center justify-center rounded-full text-fg-secondary  transition-all duration-300 hover:text-fg-primary"
			title={`Switch theme (current: ${MODE_LABELS[mode]})`}
			aria-label={`Switch theme, current ${MODE_LABELS[mode]}, next ${MODE_LABELS[nextMode]}`}
		>
			<span className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-primary/70">
				<span
					className={cn(
						"transition-all duration-300 ease-out text-fg-primary",
						{
							"rotate-0 scale-100": mode === "light",
							"rotate-12 scale-110": mode === "dark",
							"rotate-0  scale-100": mode === "auto",
						},
					)}
				>
					{MODE_ICONS[mode]}
				</span>
			</span>
		</button>
	);
}
