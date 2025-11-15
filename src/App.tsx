import { Sandpack } from "@codesandbox/sandpack-react";
import "./App.css";

export default function App() {
	return (
		<div className="w-screen h-screen p-12">
			<Sandpack
				files={{
					"/Wrapper.js": `export default () => "";`,

					"/Button.js": {
						code: `export default () => {
	return <button>Hello</button>
  };`,
						readOnly: true, // Set as non-editable, defaults to `false`
						active: true, // Set as main file, defaults to `false`
						hidden: false, // Tab visibility, defaults to `false`
					},
				}}
				template="react"
				options={{
					editorHeight: "800px",
					layout: "preview",
					showConsole: true,
					showTabs: true,
					showNavigator: true,
					showLineNumbers: true,
				}}
			/>
		</div>
	);
}
