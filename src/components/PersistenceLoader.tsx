import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useFs } from "@/modules/fs/store";

type LoadingPhase = "loading" | "transitioning" | "done";

// Header logo position
const HEADER_LOGO_X = 26; // px from left edge to logo center
const HEADER_LOGO_Y = 20; // px from top (half of 40px header)
const LOGO_SIZE = 80; // Loading logo size
const HEADER_LOGO_SIZE = 20; // Header logo size

/**
 * Component that loads persisted workspace on mount with animated transition
 */
export function PersistenceLoader({ children }: { children: React.ReactNode }) {
	const { loadFromPersistence } = useFs();
	const [phase, setPhase] = useState<LoadingPhase>("loading");

	useEffect(() => {
		const loadData = async () => {
			try {
				const loaded = await loadFromPersistence();
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
	}, [loadFromPersistence]);

	return (
		<>
			<AnimatePresence>
				{phase !== "done" && (
					<motion.div
						className="fixed inset-0 z-50 bg-bg-primary flex items-center justify-center overflow-hidden"
						initial={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2, delay: 0.3 }}
					>
						{/* Background gradient effect */}
						<motion.div
							className="absolute inset-0 pointer-events-none"
							animate={
								phase === "transitioning" ? { opacity: 0 } : { opacity: 1 }
							}
							transition={{ duration: 0.3 }}
						>
							<motion.div
								className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"
								animate={{
									scale: [1, 1.2, 1],
									opacity: [0.5, 0.8, 0.5],
								}}
								transition={{
									duration: 3,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
								}}
							/>
							<motion.div
								className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
								animate={{
									scale: [1.2, 1, 1.2],
									opacity: [0.5, 0.8, 0.5],
								}}
								transition={{
									duration: 3,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
								}}
							/>
						</motion.div>

						{/* Logo that flies to header */}
						<motion.img
							src="https://lovable.dev/icon.svg?9e0c9b5bb1bae062"
							alt="Lovable"
							className="z-30"
							style={{
								position: "fixed",
								width: phase === "transitioning" ? HEADER_LOGO_SIZE : LOGO_SIZE,
								height:
									phase === "transitioning" ? HEADER_LOGO_SIZE : LOGO_SIZE,
								top:
									phase === "transitioning"
										? HEADER_LOGO_Y - HEADER_LOGO_SIZE / 2
										: "calc(50% - 108px)",
								left:
									phase === "transitioning"
										? HEADER_LOGO_X - HEADER_LOGO_SIZE / 2
										: "calc(50% - 190px)",
								transform: "none",
								transition:
									"top 0.6s cubic-bezier(0.4, 0, 0.2, 1), left 0.6s cubic-bezier(0.4, 0, 0.2, 1), width 0.6s cubic-bezier(0.4, 0, 0.2, 1), height 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
							}}
							initial={false}
							animate={{
								rotate: phase === "loading" ? [0, 5, -5, 0] : 0,
							}}
							transition={{
								rotate: {
									duration: 3,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
								},
							}}
						/>

						{/* Loading content */}
						<motion.div
							className="flex flex-col items-center z-10"
							initial={{ opacity: 0, y: 20 }}
							animate={
								phase === "transitioning"
									? { opacity: 0, y: -30 }
									: { opacity: 1, y: 0 }
							}
							transition={{
								duration: phase === "transitioning" ? 0.3 : 0.5,
								ease: "easeOut",
							}}
						>
							{/* Logo placeholder + text row */}
							<div className="flex items-center gap-4 mb-6">
								{/* Invisible placeholder for logo */}
								<div style={{ width: LOGO_SIZE, height: LOGO_SIZE }} />
								<motion.span
									className="text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent"
									animate={phase === "loading" ? { scale: [1, 1.02, 1] } : {}}
									transition={{
										duration: 2,
										repeat: Number.POSITIVE_INFINITY,
										ease: "easeInOut",
									}}
								>
									Mini Lovable
								</motion.span>
							</div>

							{/* Tagline */}
							<motion.p
								className="text-base text-fg-secondary mb-10"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.3 }}
							>
								Build beautiful apps with AI
							</motion.p>

							{/* Loading indicator */}
							<div className="flex items-center gap-3 mb-4">
								{[0, 1, 2].map((i) => (
									<motion.div
										key={i}
										className={`w-4 h-4 rounded-full ${
											i === 0
												? "bg-pink-500"
												: i === 1
													? "bg-purple-500"
													: "bg-indigo-500"
										}`}
										animate={{
											y: [0, -12, 0],
										}}
										transition={{
											duration: 0.6,
											repeat: Number.POSITIVE_INFINITY,
											delay: i * 0.15,
											ease: "easeInOut",
										}}
									/>
								))}
							</div>

							<motion.p
								className="text-sm text-fg-muted"
								animate={{ opacity: [0.5, 1, 0.5] }}
								transition={{
									duration: 1.5,
									repeat: Number.POSITIVE_INFINITY,
								}}
							>
								Loading workspace...
							</motion.p>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Main content - only render after loading is complete */}
			{phase === "done" && children}
		</>
	);
}
