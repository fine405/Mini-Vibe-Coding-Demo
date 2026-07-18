import { cn } from "@/lib/utils";
import { useThemeStore } from "@/modules/theme/store";

export function ThemeNoiseTexture() {
	const mode = useThemeStore((state) => state.mode);

	return (
		<figure
			aria-hidden="true"
			className={cn(
				"theme-noise-texture pointer-events-none fixed inset-0 z-30 opacity-0 transition-opacity duration-300 motion-reduce:transition-none",
				mode === "night" && "opacity-10",
				mode === "day" && "opacity-15",
			)}
			data-testid="theme-noise-texture"
		/>
	);
}
