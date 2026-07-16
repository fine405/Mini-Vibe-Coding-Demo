"use client";

import { BookOpenTextIcon, ChevronDownIcon, GlobeIcon } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import {
	createContext,
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	type RefObject,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPEN_DELAY_MS = 100;
const CLOSE_DELAY_MS = 120;

type SourcesContextValue = {
	cancelClose(): void;
	closeSoon(): void;
	consumeContentAutoFocus(): boolean;
	contentRef: RefObject<HTMLDivElement | null>;
	focusSources(): void;
	open: boolean;
	openForFocus(): void;
	openForHover(): void;
	setOpen(open: boolean): void;
};

const SourcesContext = createContext<SourcesContextValue | null>(null);

export function Sources({ children }: { children: ReactNode }) {
	const [open, setOpenState] = useState(false);
	const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const focusContentOnOpenRef = useRef(false);
	const contentRef = useRef<HTMLDivElement>(null);

	const cancelOpen = () => {
		if (openTimerRef.current) clearTimeout(openTimerRef.current);
		openTimerRef.current = null;
	};
	const cancelClose = () => {
		if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
		closeTimerRef.current = null;
	};
	const setOpen = (nextOpen: boolean) => {
		if (!nextOpen) {
			cancelOpen();
			cancelClose();
			focusContentOnOpenRef.current = false;
		}
		setOpenState(nextOpen);
	};
	const closeSoon = () => {
		cancelOpen();
		cancelClose();
		closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
	};
	const openForFocus = () => {
		cancelOpen();
		cancelClose();
		focusContentOnOpenRef.current = false;
		setOpen(true);
	};
	const openForHover = () => {
		cancelClose();
		if (open || openTimerRef.current) return;
		openTimerRef.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
	};
	const focusSources = () => {
		cancelOpen();
		cancelClose();
		if (!open) {
			focusContentOnOpenRef.current = true;
			setOpen(true);
			return;
		}
		setTimeout(() => {
			contentRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
		});
	};
	const consumeContentAutoFocus = () => {
		const shouldFocus = focusContentOnOpenRef.current;
		focusContentOnOpenRef.current = false;
		return shouldFocus;
	};

	useEffect(
		() => () => {
			if (openTimerRef.current) clearTimeout(openTimerRef.current);
			if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
		},
		[],
	);

	return (
		<SourcesContext.Provider
			value={{
				cancelClose,
				closeSoon,
				consumeContentAutoFocus,
				contentRef,
				focusSources,
				open,
				openForFocus,
				openForHover,
				setOpen,
			}}
		>
			<PopoverPrimitive.Root modal={false} onOpenChange={setOpen} open={open}>
				{children}
			</PopoverPrimitive.Root>
		</SourcesContext.Provider>
	);
}

export function SourcesTrigger({ count }: { count: number }) {
	const context = useContext(SourcesContext);
	const pointerFocusRef = useRef(false);
	const openAtPointerDownRef = useRef(false);
	if (!context) throw new Error("SourcesTrigger must be used within Sources");
	const label = `${count} ${count === 1 ? "source" : "sources"}`;
	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (
			event.key === "ArrowDown" ||
			event.key === "Enter" ||
			event.key === " "
		) {
			event.preventDefault();
			context.focusSources();
		}
	};
	const handlePointer = (
		event: PointerEvent<HTMLButtonElement>,
		action: () => void,
	) => {
		if (event.pointerType !== "touch") action();
	};

	return (
		<PopoverPrimitive.Anchor asChild>
			<Button
				aria-expanded={context.open}
				aria-haspopup="dialog"
				aria-label={label}
				className="group/button h-7 gap-1.5 rounded-full px-2.5 text-muted-foreground text-xs hover:text-foreground"
				onBlur={() => {
					pointerFocusRef.current = false;
					context.closeSoon();
				}}
				onClick={(event) => {
					event.preventDefault();
					context.setOpen(!openAtPointerDownRef.current);
				}}
				onFocus={() => {
					if (!pointerFocusRef.current) context.openForFocus();
				}}
				onKeyDown={handleKeyDown}
				onPointerDown={() => {
					pointerFocusRef.current = true;
					openAtPointerDownRef.current = context.open;
				}}
				onPointerEnter={(event) => handlePointer(event, context.openForHover)}
				onPointerLeave={(event) => handlePointer(event, context.closeSoon)}
				size="sm"
				type="button"
				variant="ghost"
			>
				<BookOpenTextIcon className="size-3.5" />
				<span>{label}</span>
				<ChevronDownIcon className="size-3 transition-transform group-data-[state=open]/button:rotate-180" />
			</Button>
		</PopoverPrimitive.Anchor>
	);
}

export function SourcesContent({ children }: { children: ReactNode }) {
	const context = useContext(SourcesContext);
	if (!context) throw new Error("SourcesContent must be used within Sources");

	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				align="start"
				aria-label="Sources"
				className={cn(
					"z-50 max-h-80 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden",
					"origin-(--radix-popover-content-transform-origin) duration-100 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
				)}
				onBlurCapture={context.closeSoon}
				onFocusCapture={context.cancelClose}
				onOpenAutoFocus={(event) => {
					if (!context.consumeContentAutoFocus()) event.preventDefault();
				}}
				onPointerEnter={context.cancelClose}
				onPointerLeave={context.closeSoon}
				ref={context.contentRef}
				role="dialog"
				side="top"
				sideOffset={4}
			>
				{children}
			</PopoverPrimitive.Content>
		</PopoverPrimitive.Portal>
	);
}

export type SourceProps = {
	description?: string;
	href: string;
	icon?: string;
	title: string;
};

export function Source({ description, href, icon, title }: SourceProps) {
	const hostname = new URL(href).hostname.replace(/^www\./, "");

	return (
		<li className="min-w-0">
			<a
				aria-label={title}
				className="group/source flex min-w-0 gap-2 rounded-md p-2 outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
				href={href}
				rel="noopener noreferrer"
				target="_blank"
			>
				<span className="relative mt-0.5 size-3.5 shrink-0">
					<GlobeIcon className="size-3.5 text-muted-foreground" />
					{icon ? (
						<img
							alt=""
							className="absolute inset-0 size-3.5 rounded-sm bg-popover object-contain"
							loading="lazy"
							onError={(event) => {
								event.currentTarget.hidden = true;
							}}
							referrerPolicy="no-referrer"
							src={icon}
						/>
					) : null}
				</span>
				<span className="min-w-0">
					<span className="block truncate font-medium text-xs">{title}</span>
					<span className="block truncate text-muted-foreground text-xs">
						{hostname}
					</span>
					{description ? (
						<span className="mt-0.5 line-clamp-2 block text-muted-foreground text-xs leading-relaxed">
							{description}
						</span>
					) : null}
				</span>
			</a>
		</li>
	);
}
