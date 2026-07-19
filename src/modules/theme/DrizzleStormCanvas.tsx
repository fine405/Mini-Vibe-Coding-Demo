import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getDrizzleAudioTime } from "@/modules/theme/drizzleAudio";
import type { DrizzleStormSceneHandle } from "@/modules/theme/drizzleStormScene";
import { useThemeStore } from "@/modules/theme/store";

const prefersReducedMotion = (): boolean =>
	typeof window.matchMedia === "function" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** WebGL cloud and lightning layer beneath the Canvas 2D rain. */
export function DrizzleStormCanvas() {
	const mode = useThemeStore((state) => state.mode);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const isDrizzle = mode === "drizzle";

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !isDrizzle) return;

		let cancelled = false;
		let scene: DrizzleStormSceneHandle | null = null;
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
			if (document.hidden) {
				last = now;
				frame = window.requestAnimationFrame(tick);
				return;
			}
			const dt = last === 0 ? 0 : (now - last) / 1000;
			last = now;
			scene.update(dt, getDrizzleAudioTime());
			frame = window.requestAnimationFrame(tick);
		};

		void import("@/modules/theme/drizzleStormScene").then(
			({ createDrizzleStormScene }) => {
				if (cancelled || !canvasRef.current) return;
				scene = createDrizzleStormScene(
					canvas,
					window.innerWidth,
					window.innerHeight,
				);
				if (!scene) return;
				if (reduceMotion) {
					scene.renderStill();
				} else {
					frame = window.requestAnimationFrame(tick);
				}
				window.addEventListener("resize", handleResize);
			},
		);

		return () => {
			cancelled = true;
			window.removeEventListener("resize", handleResize);
			if (frame) window.cancelAnimationFrame(frame);
			scene?.dispose();
			scene = null;
		};
	}, [isDrizzle]);

	return (
		<canvas
			aria-hidden="true"
			className={cn(
				"pointer-events-none fixed inset-0 z-[35] h-full w-full mix-blend-screen opacity-0 transition-opacity duration-700 ease-out motion-reduce:transition-none",
				isDrizzle && "opacity-100",
			)}
			data-testid="drizzle-storm-canvas"
			ref={canvasRef}
		/>
	);
}
