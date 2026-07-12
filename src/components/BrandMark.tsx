import { SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			className={cn(
				"flex items-center justify-center rounded-[30%] bg-gradient-to-br from-orange-400 via-pink-500 to-indigo-500 text-white shadow-sm",
				className,
			)}
		>
			<SparklesIcon className="size-1/2" strokeWidth={2.5} />
		</div>
	);
}
