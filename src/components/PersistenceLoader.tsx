import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { BrandName } from "@/components/BrandName";
import { installWorkspacePersistenceFlush } from "@/modules/fs/persistence";
import { browserWorkspace } from "@/modules/workspace/browser";

type LoadingPhase = "loading" | "transitioning" | "done";

// Header logo position
const HEADER_LOGO_X = 26; // px from left edge to logo center
const HEADER_LOGO_Y = 20; // px from top (half of 40px header)
const LOGO_SIZE = 96; // Loading logo size
const HEADER_LOGO_SIZE = 20; // Header logo size

/**
 * Component that loads persisted workspace on mount with animated transition
 */
export function PersistenceLoader({ children }: { children: React.ReactNode }) {
	const [phase, setPhase] = useState<LoadingPhase>("loading");
	const reduceMotion = useReducedMotion();

	useEffect(() => installWorkspacePersistenceFlush(), []);

	useEffect(() => {
		const loadData = async () => {
			try {
				const loaded = await browserWorkspace.load();
				if (loaded) {
					console.log("✅ Workspace loaded from IndexedDB");
				} else {
					console.log("ℹ️ No saved workspace found, using defaults");
				}
			} catch (error) {
				console.error("Failed to load workspace:", error);
			}

			// Minimum display time for loading screen
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Start transition animation
			setPhase("transitioning");

			// Wait for transition to complete
			await new Promise((resolve) => setTimeout(resolve, 700));

			setPhase("done");
		};

		loadData();
	}, []);

	return (
		<>
			<AnimatePresence>
				{phase !== "done" && (
					<motion.div
						className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-bg-primary text-fg-primary"
						initial={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: reduceMotion ? 0 : 0.25, delay: 0.2 }}
					>
						<motion.div
							aria-hidden="true"
							className="pointer-events-none absolute inset-0"
							animate={
								phase === "transitioning" ? { opacity: 0 } : { opacity: 1 }
							}
							transition={{ duration: reduceMotion ? 0 : 0.35 }}
						>
							<div
								className="absolute inset-0"
								style={{
									backgroundImage:
										"radial-gradient(circle at 50% 42%, rgba(99, 102, 241, 0.18), transparent 31%), radial-gradient(circle at 18% 18%, rgba(37, 99, 235, 0.1), transparent 25%), radial-gradient(circle at 82% 78%, rgba(244, 63, 94, 0.09), transparent 28%)",
								}}
							/>
							<div
								className="absolute inset-0 opacity-60"
								style={{
									backgroundImage:
										"linear-gradient(rgba(148, 163, 184, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px)",
									backgroundSize: "44px 44px",
									maskImage:
										"radial-gradient(circle at center, black, transparent 72%)",
									WebkitMaskImage:
										"radial-gradient(circle at center, black, transparent 72%)",
								}}
							/>
							<div
								className="absolute size-[26rem] rounded-full bg-indigo-500/10 blur-[100px]"
								style={{
									left: "50%",
									top: "calc(50% - 90px)",
									transform: "translate(-50%, -50%)",
								}}
							/>
						</motion.div>

						<motion.div
							aria-label="Mini Lovable"
							className="z-30 drop-shadow-[0_24px_48px_rgba(49,46,129,0.28)]"
							role="img"
							style={{
								position: "fixed",
								width: phase === "transitioning" ? HEADER_LOGO_SIZE : LOGO_SIZE,
								height:
									phase === "transitioning" ? HEADER_LOGO_SIZE : LOGO_SIZE,
								top:
									phase === "transitioning"
										? HEADER_LOGO_Y - HEADER_LOGO_SIZE / 2
										: "calc(50% - 138px)",
								left:
									phase === "transitioning"
										? HEADER_LOGO_X - HEADER_LOGO_SIZE / 2
										: `calc(50% - ${LOGO_SIZE / 2}px)`,
								transition: reduceMotion
									? "none"
									: "top 0.6s cubic-bezier(0.22, 1, 0.36, 1), left 0.6s cubic-bezier(0.22, 1, 0.36, 1), width 0.6s cubic-bezier(0.22, 1, 0.36, 1), height 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
							}}
							initial={false}
							animate={
								phase === "loading" && !reduceMotion
									? { scale: [1, 1.025, 1], y: [0, -4, 0] }
									: { scale: 1, y: 0 }
							}
							transition={{
								scale: {
									duration: 2.4,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
								},
								y: {
									duration: 2.4,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
								},
							}}
						>
							<BrandMark className="size-full" />
						</motion.div>

						<motion.div
							className="z-10 flex w-full flex-col items-center px-6 text-center"
							initial={{ opacity: 0, y: 20 }}
							animate={
								phase === "transitioning"
									? { opacity: 0, y: -30 }
									: { opacity: 1, y: 0 }
							}
							transition={{
								duration: reduceMotion
									? 0
									: phase === "transitioning"
										? 0.25
										: 0.5,
								ease: "easeOut",
							}}
						>
							<div aria-hidden="true" className="h-28 w-24" />
							<BrandName className="text-[clamp(2.75rem,8vw,4.5rem)] font-[680]" />
							<motion.p
								className="mt-4 text-[15px] font-medium tracking-[-0.01em] text-fg-secondary"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: reduceMotion ? 0 : 0.25 }}
							>
								Build beautiful apps with AI
							</motion.p>

							<div className="mt-10 w-56">
								<div className="mb-3 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.2em] text-fg-muted">
									<span>Preparing workspace</span>
									<motion.span
										aria-hidden="true"
										className="size-1.5 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.9)]"
										animate={
											reduceMotion
												? { opacity: 1 }
												: { opacity: [0.35, 1, 0.35], scale: [0.85, 1, 0.85] }
										}
										transition={{
											duration: 1.25,
											repeat: Number.POSITIVE_INFINITY,
											ease: "easeInOut",
										}}
									/>
								</div>
								<div className="h-0.5 overflow-hidden rounded-full bg-fg-primary/10">
									<motion.div
										className="h-full w-1/2 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-rose-400"
										animate={{ x: reduceMotion ? "100%" : ["-120%", "220%"] }}
										transition={{
											duration: 1.35,
											repeat: Number.POSITIVE_INFINITY,
											ease: "easeInOut",
										}}
									/>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Main content - only render after loading is complete */}
			{phase === "done" && children}
		</>
	);
}
