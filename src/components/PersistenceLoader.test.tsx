import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PersistenceLoader } from "@/components/PersistenceLoader";

vi.mock("@/modules/fs/persistence", () => ({
	installWorkspacePersistenceFlush: vi.fn(),
}));

vi.mock("@/modules/workspace/browser", () => ({
	browserWorkspace: {
		load: vi.fn().mockResolvedValue(false),
	},
}));

describe("PersistenceLoader", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("lands the loading mark exactly over the chat header mark", async () => {
		vi.useFakeTimers();
		render(
			<PersistenceLoader>
				<div>Workspace</div>
			</PersistenceLoader>,
		);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000);
		});

		expect(screen.getByRole("img", { name: "Mini Lovable" })).toHaveStyle({
			height: "20px",
			left: "12px",
			top: "10px",
			width: "20px",
		});
	});
});
