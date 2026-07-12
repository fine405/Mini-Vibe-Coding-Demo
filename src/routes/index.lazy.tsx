import { ClientOnly, createLazyFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initTheme } from "@/modules/theme/store";

const IdeApp = lazy(() => import("@/App"));

export const Route = createLazyFileRoute("/")({
	component: IdeRoute,
});

function IdeRoute() {
	useEffect(() => {
		initTheme();
	}, []);

	return (
		<TooltipProvider>
			<ClientOnly
				fallback={<div className="h-screen w-screen bg-bg-primary" />}
			>
				<Suspense
					fallback={<div className="h-screen w-screen bg-bg-primary" />}
				>
					<IdeApp />
				</Suspense>
			</ClientOnly>
		</TooltipProvider>
	);
}
