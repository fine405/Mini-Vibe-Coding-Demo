import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
	const reduceMotion = useReducedMotion();
	const id = useId().replaceAll(":", "");
	const surfaceGradientId = `${id}-surface`;
	const ribbonGradientId = `${id}-ribbon`;
	const ribbonPath = "M13 42 C16 18 25 18 32 39 C39 18 48 18 51 42";

	return (
		<div
			aria-hidden="true"
			className={cn(
				"shrink-0 overflow-hidden rounded-[30%] bg-[#090a0f] shadow-[0_10px_30px_-16px_rgba(76,90,180,0.8)] ring-1 ring-white/10",
				className,
			)}
		>
			<svg
				className="size-full"
				fill="none"
				focusable="false"
				viewBox="0 0 64 64"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<linearGradient
						gradientUnits="userSpaceOnUse"
						id={surfaceGradientId}
						x1="9"
						x2="55"
						y1="7"
						y2="58"
					>
						<stop stopColor="#171923" />
						<stop offset="1" stopColor="#08090D" />
					</linearGradient>
					<linearGradient
						gradientUnits="userSpaceOnUse"
						id={ribbonGradientId}
						x1="13"
						x2="51"
						y1="30"
						y2="30"
					>
						<stop stopColor="#E8F0FF" />
						<stop offset="0.38" stopColor="#8EACFF" />
						<stop offset="0.72" stopColor="#8B6CF6" />
						<stop offset="1" stopColor="#C4A7FF" />
					</linearGradient>
				</defs>

				<rect
					fill={`url(#${surfaceGradientId})`}
					height="64"
					rx="19"
					width="64"
				/>
				<rect
					height="63"
					rx="18.5"
					stroke="white"
					strokeOpacity="0.08"
					width="63"
					x="0.5"
					y="0.5"
				/>
				<path
					d={ribbonPath}
					stroke="white"
					strokeLinecap="round"
					strokeOpacity="0.07"
					strokeWidth="9"
				/>
				<path
					d={ribbonPath}
					stroke={`url(#${ribbonGradientId})`}
					strokeLinecap="round"
					strokeWidth="5.75"
				/>
				<motion.path
					animate={{ strokeDashoffset: reduceMotion ? 0 : [1, -1] }}
					d={ribbonPath}
					pathLength="1"
					stroke="white"
					strokeDasharray="0.12 0.88"
					strokeLinecap="round"
					strokeOpacity="0.85"
					strokeWidth="1.6"
					transition={{
						duration: 3.2,
						ease: "linear",
						repeat: Number.POSITIVE_INFINITY,
					}}
				/>
			</svg>
		</div>
	);
}
