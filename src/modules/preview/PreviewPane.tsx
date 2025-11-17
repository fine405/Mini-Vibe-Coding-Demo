import { Sandpack } from "@codesandbox/sandpack-react";
import { useFs } from "@/modules/fs/store";

export function PreviewPane() {
	const { filesByPath, activeFilePath } = useFs();

	const files = Object.fromEntries(
		Object.entries(filesByPath).map(([path, file]) => [
			path,
			{
				code: file.content,
			},
		]),
	);

	return (
		<div className="h-full w-full flex flex-col bg-neutral-950 text-neutral-100">
			<div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 border-b border-neutral-800/60 flex items-center justify-between">
				<span>Preview</span>
			</div>
			<Sandpack
				files={files}
				template="react"
				options={{
					activeFile: activeFilePath || undefined,
					editorHeight: "calc(100vh - 32px)",
					showConsole: true,
					showConsoleButton: true,
				}}
			/>
		</div>
	);
}
