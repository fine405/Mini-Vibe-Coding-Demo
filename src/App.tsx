import "@/App.css";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { CommandPalette } from "@/components/CommandPalette";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/Header";
import { PersistenceLoader } from "@/components/PersistenceLoader";
import { Toaster } from "@/components/ui/toaster";
import { AppDialogs } from "@/modules/app/AppDialogs";
import { useCommandRegistry } from "@/modules/app/use-command-registry";
import { useProjectController } from "@/modules/app/use-project-controller";
import { ChatPane } from "@/modules/chat/ChatPane";
import { FileTreePane } from "@/modules/fs/FileTreePane";
import { useLayoutStore } from "@/modules/layout/store";
import {
	TourAlertDialog,
	TourProvider,
	tourSteps,
	useTour,
} from "@/modules/tour";

const EditorPane = lazy(async () => ({
	default: (await import("@/modules/editor/EditorPane")).EditorPane,
}));
const PreviewPane = lazy(async () => ({
	default: (await import("@/modules/preview/PreviewPane")).PreviewPane,
}));

function PanelLoading({ label }: { label: string }) {
	return (
		<div className="flex h-full items-center justify-center bg-bg-primary text-xs text-fg-muted">
			Loading {label}…
		</div>
	);
}

function AppContent() {
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [tourDialogOpen, setTourDialogOpen] = useState(true);
	const project = useProjectController();
	const { showChat } = useLayoutStore();
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
		setIsTourCompleted(false);
		setTourDialogOpen(false);
		startTour();
	};

	return (
		<ErrorBoundary>
			<PersistenceLoader>
				<div className="flex h-screen w-screen flex-col bg-bg-primary text-fg-primary">
					<Header
						onExportJSON={() => project.requestExport("json")}
						onExportZip={() => project.requestExport("zip")}
						onImportJSON={() => void project.importJson()}
						onImportZip={() => void project.importZip()}
						onNewProject={project.requestNewProject}
						onOpenCommandPalette={openCommandPalette}
						onStartTour={startFeatureTour}
					/>
					<div className="flex-1 overflow-hidden">
						<PanelGroup className="h-full" direction="horizontal">
							{showChat && (
								<>
									<Panel defaultSize={20} minSize={15} order={1}>
										<ChatPane />
									</Panel>
									<PanelResizeHandle className="w-px bg-border-primary" />
								</>
							)}
							<Panel defaultSize={15} minSize={10} order={2}>
								<FileTreePane />
							</Panel>
							<PanelResizeHandle className="w-px bg-border-primary" />
							<Panel defaultSize={35} minSize={20} order={3}>
								<Suspense fallback={<PanelLoading label="editor" />}>
									<EditorPane />
								</Suspense>
							</Panel>
							<PanelResizeHandle className="w-px bg-border-primary" />
							<Panel defaultSize={30} minSize={20} order={4}>
								<Suspense fallback={<PanelLoading label="preview" />}>
									<PreviewPane />
								</Suspense>
							</Panel>
						</PanelGroup>
					</div>

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
