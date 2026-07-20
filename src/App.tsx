import "@/App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type ImperativePanelHandle,
	Panel,
	PanelGroup,
	PanelResizeHandle,
} from "react-resizable-panels";
import { CommandPalette } from "@/components/CommandPalette";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PersistenceLoader } from "@/components/PersistenceLoader";
import { Toaster } from "@/components/ui/toaster";
import { AppDialogs } from "@/modules/app/AppDialogs";
import { useCommandRegistry } from "@/modules/app/use-command-registry";
import { useProjectController } from "@/modules/app/use-project-controller";
import { ChatPane } from "@/modules/chat/ChatPane";
import { useLayoutStore } from "@/modules/layout/store";
import { WorkbenchPane } from "@/modules/layout/WorkbenchPane";
import {
	getTourSteps,
	TourAlertDialog,
	TourProvider,
	useTour,
} from "@/modules/tour";

function AppContent() {
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [tourDialogOpen, setTourDialogOpen] = useState(true);
	const [isResizingChat, setIsResizingChat] = useState(false);
	const chatPanelRef = useRef<ImperativePanelHandle>(null);
	const chatPanelReadyRef = useRef(false);
	const project = useProjectController();
	const { activeView, showChat, setChatVisible } = useLayoutStore();
	const { setSteps, startTour, setIsTourCompleted } = useTour();
	const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
	const commandActions = useCommandRegistry({
		openCommandPalette,
		requestRevertAll: project.requestRevertAll,
	});

	useEffect(() => {
		setSteps(getTourSteps(activeView));
	}, [activeView, setSteps]);

	useEffect(() => {
		if (!chatPanelReadyRef.current) {
			chatPanelReadyRef.current = true;
			return;
		}
		if (showChat) chatPanelRef.current?.expand();
		else chatPanelRef.current?.collapse();
	}, [showChat]);

	const startFeatureTour = () => {
		setChatVisible(true);
		setIsTourCompleted(false);
		setTourDialogOpen(false);
		startTour();
	};

	return (
		<ErrorBoundary>
			<PersistenceLoader>
				<div className="flex h-screen w-screen bg-bg-primary text-fg-primary">
					<PanelGroup className="h-full w-full" direction="horizontal">
						<Panel
							className={
								isResizingChat
									? undefined
									: "transition-[flex-grow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
							}
							collapsedSize={0}
							collapsible
							defaultSize={showChat ? 26 : 0}
							minSize={15}
							order={1}
							ref={chatPanelRef}
						>
							<div
								aria-hidden={!showChat}
								className={`h-full min-w-64 transition-[opacity,transform] duration-200 motion-reduce:transition-none ${
									showChat
										? "translate-x-0 opacity-100"
										: "pointer-events-none -translate-x-2 opacity-0"
								}`}
							>
								<ChatPane />
							</div>
						</Panel>
						<PanelResizeHandle
							className={`bg-border-primary transition-[width,opacity] duration-300 motion-reduce:transition-none ${
								showChat ? "w-px opacity-100" : "w-0 opacity-0"
							}`}
							disabled={!showChat}
							onDragging={setIsResizingChat}
						/>
						<Panel defaultSize={74} minSize={30} order={2}>
							<WorkbenchPane
								onExportJSON={() => project.requestExport("json")}
								onExportZip={() => project.requestExport("zip")}
								onImportJSON={() => void project.importJson()}
								onImportZip={() => void project.importZip()}
								onNewProject={project.requestNewProject}
								onOpenCommandPalette={openCommandPalette}
								onStartTour={startFeatureTour}
							/>
						</Panel>
					</PanelGroup>

					<CommandPalette
						customActions={commandActions}
						isOpen={commandPaletteOpen}
						onClose={() => setCommandPaletteOpen(false)}
					/>
					<AppDialogs controller={project} />
					<Toaster />
				</div>

				<TourAlertDialog
					isOpen={tourDialogOpen}
					setIsOpen={setTourDialogOpen}
				/>
			</PersistenceLoader>
		</ErrorBoundary>
	);
}

export default function App() {
	return (
		<TourProvider>
			<AppContent />
		</TourProvider>
	);
}
