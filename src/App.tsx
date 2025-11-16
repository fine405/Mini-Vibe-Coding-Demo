import "./App.css";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ChatPane } from "./modules/chat/ChatPane";
import { PreviewPane } from "./modules/preview/PreviewPane";

export default function App() {
	return (
		<div className="w-screen h-screen bg-neutral-950 text-neutral-100">
			<PanelGroup direction="horizontal" className="h-full">
				<Panel defaultSize={20} minSize={10}>
					<ChatPane />
				</Panel>
				<PanelResizeHandle className="w-px bg-neutral-800/80" />
				<PanelResizeHandle className="w-px bg-neutral-800/80" />
				<Panel defaultSize={80} minSize={25}>
					<PreviewPane />
				</Panel>
			</PanelGroup>
		</div>
	);
}
