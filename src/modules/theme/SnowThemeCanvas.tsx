import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { SnowSceneHandle } from "@/modules/theme/snowScene";
import { useThemeStore } from "@/modules/theme/store";

const prefersReducedMotion = (): boolean =>
	typeof window.matchMedia === "function" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Fullscreen 3D snowfall overlay for the Snow theme.
 *
 * Always mounted next to the other theme effects but only active in Snow
 * mode: entering the theme dynamically imports the three.js scene (keeping
 * the WebGL bundle out of the initial chunk) and starts the loop; leaving
 * cancels the loop and disposes every GPU resource. The canvas itself fades
 * with the same 700ms transition as the Summer overlay and never intercepts
 * pointer input.
 */
export function SnowThemeCanvas() {
	const mode = useThemeStore((state) => state.mode);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const isSnow = mode === "snow";

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !isSnow) return;

		let cancelled = false;
		let scene: SnowSceneHandle | null = null;
		let frame = 0;
		let last = 0;
		const reduceMotion = prefersReducedMotion();

		const handleResize = () => {
			if (!scene) return;
			scene.resize(window.innerWidth, window.innerHeight);
			if (reduceMotion) scene.renderStill();
		};

		const tick = (now: number) => {
			if (!scene) return;
			const dt = last === 0 ? 0 : (now - last) / 1000;
			last = now;
			scene.update(dt);
			frame = window.requestAnimationFrame(tick);
		};

		void import("@/modules/theme/snowScene").then(({ createSnowScene }) => {
			if (cancelled || !canvasRef.current) return;
			scene = createSnowScene(canvas, window.innerWidth, window.innerHeight);
			if (!scene) return;
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
	}, [isSnow]);

	return (
		<canvas
			aria-hidden="true"
			className={cn(
				"pointer-events-none fixed inset-0 z-40 h-full w-full opacity-0 transition-opacity duration-700 ease-out motion-reduce:transition-none",
				isSnow && "opacity-100",
			)}
			data-testid="snow-theme-canvas"
			ref={canvasRef}
		/>
	);
}
