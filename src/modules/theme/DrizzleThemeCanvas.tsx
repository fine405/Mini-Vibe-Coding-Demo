import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getDrizzleAudioTime } from "@/modules/theme/drizzleAudio";
import { collectRainDomSurfaces } from "@/modules/theme/rainDomSurfaces";
import type { RainSceneHandle } from "@/modules/theme/rainScene2d";
import { useThemeStore } from "@/modules/theme/store";

const prefersReducedMotion = (): boolean =>
	typeof window.matchMedia === "function" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Fullscreen drizzle overlay for the Drizzle theme.
 *
 * Always mounted next to the other theme effects but only active in Drizzle
 * mode: entering the theme dynamically imports the hybrid rain scene and
 * starts the loop; leaving cancels the loop and clears the canvas. The
 * canvas itself fades with the same 700ms transition as the other theme
 * overlays and never intercepts pointer input.
 */
export function DrizzleThemeCanvas() {
	const mode = useThemeStore((state) => state.mode);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const waterCanvasRef = useRef<HTMLCanvasElement>(null);
	const isDrizzle = mode === "drizzle";

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !isDrizzle) return;

		let cancelled = false;
		let scene: RainSceneHandle | null = null;
		let frame = 0;
		let last = 0;
		let lastSurfaceRefresh = 0;
		const reduceMotion = prefersReducedMotion();
		const syncSurfaces = () => scene?.setSurfaces(collectRainDomSurfaces());

		const handleResize = () => {
			if (!scene) return;
			scene.resize(window.innerWidth, window.innerHeight);
			syncSurfaces();
			if (reduceMotion) scene.renderStill();
		};

		const tick = (now: number) => {
			if (!scene) return;
			const dt = last === 0 ? 0 : (now - last) / 1000;
			last = now;
			if (now - lastSurfaceRefresh >= 100) {
				syncSurfaces();
				lastSurfaceRefresh = now;
			}
			scene.update(dt, getDrizzleAudioTime());
			frame = window.requestAnimationFrame(tick);
		};

		void import("@/modules/theme/rainScene2d").then(({ createRainScene }) => {
			if (cancelled || !canvasRef.current) return;
			scene = createRainScene(
				canvas,
				waterCanvasRef.current,
				window.innerWidth,
				window.innerHeight,
			);
			if (!scene) return;
			syncSurfaces();
			if (reduceMotion) {
				scene.renderStill();
			} else {
				frame = window.requestAnimationFrame(tick);
			}
			window.addEventListener("resize", handleResize);
		});

		return () => {
			cancelled = true;
			window.removeEventListener("resize", handleResize);
			if (frame) window.cancelAnimationFrame(frame);
			scene?.dispose();
			scene = null;
		};
	}, [isDrizzle]);

	const canvasClassName = cn(
		"pointer-events-none fixed inset-0 z-40 h-full w-full opacity-0 transition-opacity duration-700 ease-out motion-reduce:transition-none",
		isDrizzle && "opacity-100",
	);

	return (
		<>
			<canvas
				aria-hidden="true"
				className={canvasClassName}
				data-testid="drizzle-theme-canvas"
				ref={canvasRef}
			/>
			<canvas
				aria-hidden="true"
				className={canvasClassName}
				data-testid="drizzle-water-canvas"
				ref={waterCanvasRef}
			/>
		</>
	);
}
