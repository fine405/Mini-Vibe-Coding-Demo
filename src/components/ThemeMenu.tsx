import {
	ChevronDown,
	CloudRain,
	Leaf,
	Moon,
	Sun,
	SunMedium,
	Wind,
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SummerThemeMedia } from "@/modules/theme/SummerThemeMedia";
import { useThemeStore } from "@/modules/theme/store";
import type { ThemeMode } from "@/modules/theme/types";

const THEME_OPTIONS: Array<{
	mode: ThemeMode;
	label: string;
	shortcut: string;
	icon: typeof Sun;
	pending?: boolean;
}> = [
	{ mode: "day", label: "Day", shortcut: "D", icon: Sun },
	{ mode: "night", label: "Night", shortcut: "N", icon: Moon },
	{ mode: "summer", label: "Summer", shortcut: "S", icon: Leaf },
	{
		mode: "drizzle",
		label: "Drizzle",
		shortcut: "R",
		icon: CloudRain,
		pending: true,
	},
	{
		mode: "breeze",
		label: "Breeze",
		shortcut: "B",
		icon: Wind,
		pending: true,
	},
];

const SHORTCUT_MODES: Record<string, ThemeMode> = {
	d: "day",
	n: "night",
	s: "summer",
	r: "drizzle",
	b: "breeze",
};

const isEditableTarget = (target: EventTarget | null) =>
	target instanceof Element &&
	Boolean(
		target.closest(
			'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
		),
	);

export function ThemeMenu() {
	const { mode, setMode } = useThemeStore();
	const activeOption = THEME_OPTIONS.find((option) => option.mode === mode);
	const activeLabel = activeOption?.label ?? "Theme";
	const ActiveIcon = activeOption?.icon ?? SunMedium;

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.metaKey ||
				event.ctrlKey ||
				event.altKey ||
				isEditableTarget(event.target)
			) {
				return;
			}

			const nextMode = SHORTCUT_MODES[event.key.toLowerCase()];
			if (!nextMode) return;
			event.preventDefault();
			setMode(nextMode);
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [setMode]);

	return (
		<>
			<SummerThemeMedia />
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						aria-label={`Theme: ${activeLabel}`}
						className="h-7 gap-1.5 px-2 text-fg-muted hover:bg-bg-tertiary hover:text-fg-primary data-open:bg-bg-tertiary data-open:text-fg-primary"
						size="sm"
						variant="ghost"
					>
						<ActiveIcon className="h-3.5 w-3.5" />
						<span className="text-xs font-medium">Theme</span>
						<ChevronDown className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-52">
					<DropdownMenuRadioGroup
						onValueChange={(value) => setMode(value as ThemeMode)}
						value={mode}
					>
						{THEME_OPTIONS.map((option) => (
							<DropdownMenuRadioItem key={option.mode} value={option.mode}>
								<option.icon className="h-4 w-4 text-fg-muted" />
								<span>{option.label}</span>
								{option.pending && (
									<span className="ml-auto text-[10px] text-fg-muted">
										Soon
									</span>
								)}
								<DropdownMenuShortcut
									className={option.pending ? "ml-1 mr-4" : "mr-4"}
								>
									{option.shortcut}
								</DropdownMenuShortcut>
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
