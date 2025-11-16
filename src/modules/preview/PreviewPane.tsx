import {
	Sandpack,
} from "@codesandbox/sandpack-react";

export function PreviewPane() {
	return (
		<div className="h-full w-full flex flex-col bg-neutral-950 text-neutral-100">
			<div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 border-b border-neutral-800/60 flex items-center justify-between">
				<span>IDE</span>
			</div>
			<Sandpack
				options={{
					editorHeight: "calc(100vh - 32px)",
					showConsole: true,
					showConsoleButton: true,
				}}
			/>
		</div>
	);
}
