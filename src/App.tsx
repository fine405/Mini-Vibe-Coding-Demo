import "./App.css";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { PersistenceLoader } from "./components/PersistenceLoader";
import { ChatPane } from "./modules/chat/ChatPane";
import { FileTreePane } from "./modules/fs/FileTreePane";
import { PreviewPane } from "./modules/preview/PreviewPane";

export default function App() {
	return (
		<PersistenceLoader>
			<div className="w-screen h-screen bg-neutral-950 text-neutral-100">
				<PanelGroup direction="horizontal" className="h-full">
					<Panel defaultSize={18} minSize={10}>
						<ChatPane />
					</Panel>
					<PanelResizeHandle className="w-px bg-neutral-800/80" />
					<Panel defaultSize={24} minSize={15}>
						<FileTreePane />
					</Panel>
					<PanelResizeHandle className="w-px bg-neutral-800/80" />
					<Panel defaultSize={58} minSize={25}>
						<PreviewPane />
					</Panel>
				</PanelGroup>
			</div>
		</PersistenceLoader>
	);
}
