import { cn } from "@/lib/utils";

export function BrandName({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex items-baseline whitespace-nowrap font-semibold leading-none tracking-[-0.045em]",
				className,
			)}
		>
			<span className="sr-only">Mini Lovable</span>
			<span aria-hidden="true" className="text-fg-primary">
				Mini
			</span>
			<span
				aria-hidden="true"
				className="ml-[0.24em] bg-gradient-to-r from-blue-400 via-violet-400 to-rose-400 bg-clip-text pr-[0.04em] text-transparent"
			>
				Lovable
			</span>
		</span>
	);
}
