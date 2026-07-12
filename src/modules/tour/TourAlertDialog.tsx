import { motion } from "framer-motion";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useTour } from "@/modules/tour/Tour";

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
							<BrandMark className="size-16" />
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
					<Button onClick={handleStart} className="h-10 w-full">
						Start Tour
					</Button>
					<Button
						onClick={handleSkip}
						className="h-10 w-full"
						variant="secondary"
					>
						Skip Tour
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
