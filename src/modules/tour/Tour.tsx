import { AnimatePresence, motion } from "framer-motion";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { cn } from "@/lib/utils";
import { TOUR_STORAGE_KEY } from "./constants";

export interface TourStep {
	content: ReactNode;
	selectorId: string;
	width?: number;
	height?: number;
	position?: "top" | "bottom" | "left" | "right";
}

interface TourContextType {
	currentStep: number;
	totalSteps: number;
	nextStep: () => void;
	previousStep: () => void;
	endTour: () => void;
	isActive: boolean;
	startTour: () => void;
	setSteps: (steps: TourStep[]) => void;
	steps: TourStep[];
	isTourCompleted: boolean;
	setIsTourCompleted: (completed: boolean) => void;
}

interface TourProviderProps {
	children: ReactNode;
	onComplete?: () => void;
	className?: string;
}

const TourContext = createContext<TourContextType | null>(null);

const PADDING = 16;
const CONTENT_WIDTH = 320;
const CONTENT_HEIGHT = 180;

function getElementPosition(id: string) {
	const element = document.getElementById(id);
	if (!element) return null;
	const rect = element.getBoundingClientRect();
	return {
		top: rect.top + window.scrollY,
		left: rect.left + window.scrollX,
		width: rect.width,
		height: rect.height,
	};
}

function calculateContentPosition(
	elementPos: { top: number; left: number; width: number; height: number },
	position: "top" | "bottom" | "left" | "right" = "bottom",
) {
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	let left = elementPos.left;
	let top = elementPos.top;

	switch (position) {
		case "top":
			top = elementPos.top - CONTENT_HEIGHT - PADDING;
			left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2;
			break;
		case "bottom":
			top = elementPos.top + elementPos.height + PADDING;
			left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2;
			break;
		case "left":
			left = elementPos.left - CONTENT_WIDTH - PADDING;
			top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
			break;
		case "right":
			left = elementPos.left + elementPos.width + PADDING;
			top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
			break;
	}

	return {
		top: Math.max(
			PADDING,
			Math.min(top, viewportHeight - CONTENT_HEIGHT - PADDING),
		),
		left: Math.max(
			PADDING,
			Math.min(left, viewportWidth - CONTENT_WIDTH - PADDING),
		),
		width: CONTENT_WIDTH,
		height: CONTENT_HEIGHT,
	};
}

export function TourProvider({
	children,
	onComplete,
	className,
}: TourProviderProps) {
	const [steps, setSteps] = useState<TourStep[]>([]);
	const [currentStep, setCurrentStep] = useState(-1);
	const [elementPosition, setElementPosition] = useState<{
		top: number;
		left: number;
		width: number;
		height: number;
	} | null>(null);
	const [isCompleted, setIsCompleted] = useState(() => {
		if (typeof window === "undefined") return false;
		return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
	});

	const updateElementPosition = useCallback(() => {
		if (currentStep >= 0 && currentStep < steps.length) {
			const position = getElementPosition(steps[currentStep]?.selectorId ?? "");
			if (position) {
				setElementPosition(position);
			}
		}
	}, [currentStep, steps]);

	useEffect(() => {
		updateElementPosition();
		window.addEventListener("resize", updateElementPosition);
		window.addEventListener("scroll", updateElementPosition);

		return () => {
			window.removeEventListener("resize", updateElementPosition);
			window.removeEventListener("scroll", updateElementPosition);
		};
	}, [updateElementPosition]);

	// Keyboard navigation for tour
	useEffect(() => {
		if (currentStep < 0) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight" || e.key === "Enter") {
				e.preventDefault();
				if (currentStep >= steps.length - 1) {
					setCurrentStep(-1);
					setIsCompleted(true);
					localStorage.setItem(TOUR_STORAGE_KEY, "true");
					onComplete?.();
				} else {
					setCurrentStep((prev) => prev + 1);
				}
			} else if (e.key === "ArrowLeft") {
				e.preventDefault();
				setCurrentStep((prev) => Math.max(0, prev - 1));
			} else if (e.key === "Escape") {
				e.preventDefault();
				setCurrentStep(-1);
				setIsCompleted(true);
				localStorage.setItem(TOUR_STORAGE_KEY, "true");
				onComplete?.();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [currentStep, steps.length, onComplete]);

	const nextStep = useCallback(() => {
		setCurrentStep((prev) => {
			if (prev >= steps.length - 1) {
				return -1;
			}
			return prev + 1;
		});

		if (currentStep === steps.length - 1) {
			setIsCompleted(true);
			localStorage.setItem(TOUR_STORAGE_KEY, "true");
			onComplete?.();
		}
	}, [currentStep, steps.length, onComplete]);

	const previousStep = useCallback(() => {
		setCurrentStep((prev) => Math.max(0, prev - 1));
	}, []);

	const endTour = useCallback(() => {
		setCurrentStep(-1);
		setIsCompleted(true);
		localStorage.setItem(TOUR_STORAGE_KEY, "true");
		onComplete?.();
	}, [onComplete]);

	const startTour = useCallback(() => {
		if (steps.length > 0) {
			setCurrentStep(0);
		}
	}, [steps.length]);

	const setIsTourCompleted = useCallback((completed: boolean) => {
		setIsCompleted(completed);
		localStorage.setItem(TOUR_STORAGE_KEY, completed ? "true" : "false");
	}, []);

	const isActive = currentStep >= 0 && currentStep < steps.length;

	return (
		<TourContext.Provider
			value={{
				currentStep,
				totalSteps: steps.length,
				nextStep,
				previousStep,
				endTour,
				isActive,
				startTour,
				setSteps,
				steps,
				isTourCompleted: isCompleted,
				setIsTourCompleted,
			}}
		>
			{children}
			<AnimatePresence>
				{isActive && elementPosition && (
					<>
						{/* Overlay with cutout */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-99 bg-black/60"
							style={{
								clipPath: `polygon(
									0% 0%,
									0% 100%,
									${elementPosition.left}px 100%,
									${elementPosition.left}px ${elementPosition.top}px,
									${elementPosition.left + (steps[currentStep]?.width || elementPosition.width)}px ${elementPosition.top}px,
									${elementPosition.left + (steps[currentStep]?.width || elementPosition.width)}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height)}px,
									${elementPosition.left}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height)}px,
									${elementPosition.left}px 100%,
									100% 100%,
									100% 0%
								)`,
							}}
							onClick={endTour}
						/>

						{/* Highlight border */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							style={{
								position: "fixed",
								top: elementPosition.top,
								left: elementPosition.left,
								width: steps[currentStep]?.width || elementPosition.width,
								height: steps[currentStep]?.height || elementPosition.height,
							}}
							className={cn(
								"z-100 rounded-md border-2 border-accent pointer-events-none",
								className,
							)}
						/>

						{/* Content popover */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{
								opacity: 1,
								y: 0,
								top: calculateContentPosition(
									elementPosition,
									steps[currentStep]?.position,
								).top,
								left: calculateContentPosition(
									elementPosition,
									steps[currentStep]?.position,
								).left,
							}}
							transition={{
								duration: 0.3,
								ease: [0.16, 1, 0.3, 1],
							}}
							exit={{ opacity: 0, y: 10 }}
							style={{
								position: "fixed",
								width: calculateContentPosition(
									elementPosition,
									steps[currentStep]?.position,
								).width,
							}}
							className="bg-bg-primary z-100 rounded-lg border border-border-primary p-4 shadow-lg"
						>
							<div className="text-fg-muted absolute right-4 top-4 text-xs">
								{currentStep + 1} / {steps.length}
							</div>
							<AnimatePresence mode="wait">
								<motion.div
									key={`tour-content-${currentStep}`}
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.95 }}
									className="overflow-hidden"
									transition={{ duration: 0.2 }}
								>
									{steps[currentStep]?.content}
								</motion.div>
							</AnimatePresence>
							<div className="mt-4 flex items-center justify-between">
								<div className="flex items-center gap-2">
									{currentStep > 0 && (
										<button
											type="button"
											onClick={previousStep}
											className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg-primary transition-colors"
										>
											<kbd className="px-1 py-0.5 rounded bg-bg-tertiary text-[10px]">
												←
											</kbd>
											Previous
										</button>
									)}
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={endTour}
										className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg-primary transition-colors"
									>
										Skip
										<kbd className="px-1 py-0.5 rounded bg-bg-tertiary text-[10px]">
											Esc
										</kbd>
									</button>
									<button
										type="button"
										onClick={nextStep}
										className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
									>
										{currentStep === steps.length - 1 ? "Finish" : "Next"}
										<kbd className="px-1 py-0.5 rounded bg-accent/20 text-[10px]">
											→
										</kbd>
									</button>
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</TourContext.Provider>
	);
}

export function useTour() {
	const context = useContext(TourContext);
	if (!context) {
		throw new Error("useTour must be used within a TourProvider");
	}
	return context;
}
