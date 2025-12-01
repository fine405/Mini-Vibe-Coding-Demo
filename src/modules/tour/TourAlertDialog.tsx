import { motion } from "framer-motion";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useTour } from "./Tour";

interface TourAlertDialogProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
}

export function TourAlertDialog({ isOpen, setIsOpen }: TourAlertDialogProps) {
	const { startTour, steps, isTourCompleted, currentStep, setIsTourCompleted } =
		useTour();

	// Don't show if tour is completed, no steps, or tour is active
	if (isTourCompleted || steps.length === 0 || currentStep > -1) {
		return null;
	}

	const handleStart = () => {
		setIsOpen(false);
		startTour();
	};

	const handleSkip = () => {
		setIsOpen(false);
		setIsTourCompleted(true);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="max-w-md p-6">
				<DialogHeader className="flex flex-col items-center justify-center">
					<div className="relative mb-4">
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						>
							<img
								src="https://lovable.dev/icon.svg?9e0c9b5bb1bae062"
								alt="Lovable"
								className="h-16 w-16"
							/>
						</motion.div>
					</div>
					<DialogTitle className="text-center text-xl font-medium">
						Welcome to Mini Lovable
					</DialogTitle>
					<DialogDescription className="text-fg-muted mt-2 text-center text-sm">
						Take a quick tour to learn about the key features and how to use
						this AI-powered coding surface.
					</DialogDescription>
				</DialogHeader>
				<div className="mt-6 space-y-3">
					<button
						type="button"
						onClick={handleStart}
						className="w-full px-4 py-2.5 text-sm rounded-md bg-accent hover:bg-accent-hover text-white font-medium transition-colors"
					>
						Start Tour
					</button>
					<button
						type="button"
						onClick={handleSkip}
						className="w-full px-4 py-2.5 text-sm rounded-md bg-bg-tertiary hover:bg-bg-secondary text-fg-secondary transition-colors"
					>
						Skip Tour
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
