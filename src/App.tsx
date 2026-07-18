import "@/App.css";
import { useCallback, useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
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
	TourAlertDialog,
	TourProvider,
	tourSteps,
	useTour,
} from "@/modules/tour";

function AppContent() {
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [tourDialogOpen, setTourDialogOpen] = useState(true);
	const project = useProjectController();
	const { showChat, setChatVisible, setActiveView } = useLayoutStore();
	const { setSteps, startTour, setIsTourCompleted } = useTour();
	const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
	const commandActions = useCommandRegistry({
		openCommandPalette,
		requestRevertAll: project.requestRevertAll,
	});

	useEffect(() => {
		setSteps(tourSteps);
	}, [setSteps]);

	const startFeatureTour = () => {
		setChatVisible(true);
		setActiveView("code");
		setIsTourCompleted(false);
		setTourDialogOpen(false);
		startTour();
	};

	return (
		<ErrorBoundary>
			<PersistenceLoader>
				<div className="flex h-screen w-screen bg-bg-primary text-fg-primary">
					<PanelGroup className="h-full w-full" direction="horizontal">
						{showChat && (
							<>
								<Panel defaultSize={22} minSize={15} order={1}>
									<ChatPane />
								</Panel>
								<PanelResizeHandle className="w-px bg-border-primary" />
							</>
						)}
						<Panel defaultSize={78} minSize={30} order={2}>
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
