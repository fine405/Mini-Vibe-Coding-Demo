import { lazy, Suspense } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { FileTreePane } from "@/modules/fs/FileTreePane";
import { useLayoutStore } from "@/modules/layout/store";
import { WorkbenchHeader } from "@/modules/layout/WorkbenchHeader";
import { ConsolePanel } from "@/modules/preview/ConsolePanel";

const EditorPane = lazy(async () => ({
	default: (await import("@/modules/editor/EditorPane")).EditorPane,
}));
const PreviewPane = lazy(async () => ({
	default: (await import("@/modules/preview/PreviewPane")).PreviewPane,
}));

interface WorkbenchPaneProps {
	onOpenCommandPalette?: () => void;
	onNewProject?: () => void;
	onExportJSON?: () => void;
	onExportZip?: () => void;
	onImportJSON?: () => void;
	onImportZip?: () => void;
	onStartTour?: () => void;
}

function PanelLoading({ label }: { label: string }) {
	return (
		<div className="flex h-full items-center justify-center bg-bg-primary text-xs text-fg-muted">
			Loading {label}…
		</div>
	);
}

export function WorkbenchPane(props: WorkbenchPaneProps) {
	const { activeView, showConsole } = useLayoutStore();

	return (
		<div className="flex h-full w-full flex-col bg-bg-primary text-fg-primary">
			<WorkbenchHeader {...props} />
			<PanelGroup className="min-h-0 flex-1" direction="vertical">
				<Panel defaultSize={showConsole ? 75 : 100} minSize={30} order={1}>
					<div className="relative h-full w-full">
						<div
							className="h-full w-full"
							hidden={activeView !== "code"}
							id="tour-code-workspace"
						>
							<PanelGroup className="h-full" direction="horizontal">
								<Panel defaultSize={30} minSize={15} order={1}>
									<FileTreePane />
								</Panel>
								<PanelResizeHandle className="w-px bg-border-primary" />
								<Panel defaultSize={70} minSize={30} order={2}>
									<Suspense fallback={<PanelLoading label="editor" />}>
										<EditorPane />
									</Suspense>
								</Panel>
							</PanelGroup>
						</div>
						<div className="h-full w-full" hidden={activeView !== "preview"}>
							<Suspense fallback={<PanelLoading label="preview" />}>
								<PreviewPane />
							</Suspense>
						</div>
					</div>
				</Panel>
				{showConsole && (
					<>
						<PanelResizeHandle className="h-px cursor-row-resize bg-border-primary transition-colors hover:bg-accent" />
						<Panel defaultSize={25} minSize={10} order={2}>
							<ConsolePanel />
						</Panel>
					</>
				)}
			</PanelGroup>
		</div>
	);
}
