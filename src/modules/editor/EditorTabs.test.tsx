import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorTabs } from "@/modules/editor/EditorTabs";

describe("EditorTabs", () => {
	it("keeps tab selection and tab actions as separate buttons", () => {
		render(
			<EditorTabs
				activeFilePath="/src/App.js"
				canRevert={() => true}
				getFileStatus={() => "modified"}
				onCloseTab={vi.fn()}
				onRevert={vi.fn()}
				onSelectTab={vi.fn()}
				onToggleViewMode={vi.fn()}
				openFiles={[{ path: "/src/App.js", viewMode: "editor" }]}
			/>,
		);

		const tabButton = screen.getByTitle("/src/App.js");
		expect(tabButton).toHaveAttribute("type", "button");
		expect(tabButton.querySelector("button")).toBeNull();
	});
});
