import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentChangeSessionStore } from "@/modules/agent-chat/change-session";
import { useProjectController } from "@/modules/app/use-project-controller";
import { useFs } from "@/modules/fs/store";
import { browserWorkspace } from "@/modules/workspace/browser";
import { hashText } from "@/modules/workspace/domain";

vi.mock("@/modules/fs/persistence", () => ({
	clearWorkspace: vi.fn().mockResolvedValue(undefined),
	loadWorkspace: vi.fn().mockResolvedValue(null),
	saveWorkspace: vi.fn().mockResolvedValue(undefined),
	scheduleWorkspaceSave: vi.fn(),
}));

describe("useProjectController", () => {
	beforeEach(async () => {
		await useFs.getState().resetFs();
		useAgentChangeSessionStore.getState().clear();
	});

	it("clears the active Agent projection when a new project is confirmed", async () => {
		const path = "/src/App.js";
		const { snapshot } = await browserWorkspace.getSnapshot();
		const content = "projected content\n";
		const session = useAgentChangeSessionStore.getState();
		session.begin(snapshot);
		session.projectToolResult({
			toolName: "write_file",
			input: { path, content },
			output: { path, hash: hashText(content), bytes: content.length },
		});
		const { result } = renderHook(() => useProjectController());

		result.current.confirmNewProject();

		await waitFor(() =>
			expect(useAgentChangeSessionStore.getState().phase).toBe("idle"),
		);
	});
});
