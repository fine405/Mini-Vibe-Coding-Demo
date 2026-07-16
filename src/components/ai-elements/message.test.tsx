import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageResponse } from "@/components/ai-elements/message";

const globalStyles = readFileSync(
	path.resolve(process.cwd(), "src/index.css"),
	"utf8",
);

describe("MessageResponse", () => {
	it("keeps table export menus inside narrow messages", async () => {
		const user = userEvent.setup();
		render(
			<MessageResponse mode="static">
				{"| Metric | Value |\n| --- | --- |\n| Users | 400k |"}
			</MessageResponse>,
		);

		const table = screen.getByRole("table");
		const tableWrapper = table.closest('[data-streamdown="table-wrapper"]');
		const response = tableWrapper?.parentElement;

		expect(response).toHaveClass(
			"[&_[data-streamdown='table-wrapper']>div:first-child]:relative",
			"[&_[data-streamdown='table-wrapper']>div:first-child>div]:static",
			"[&_[data-streamdown='table-wrapper']>div:first-child>div>div]:-right-2",
		);

		await user.click(screen.getByRole("button", { name: "Download table" }));
		expect(screen.getByRole("button", { name: "Markdown" })).toBeVisible();
		expect(globalStyles).toContain(
			'@source "../node_modules/streamdown/dist/*.js";',
		);
	});
});
