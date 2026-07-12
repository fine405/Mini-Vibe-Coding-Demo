import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
	it("keeps compact import and export triggers to one icon each", () => {
		render(<Header />);

		expect(
			screen
				.getByRole("button", { name: "Import project" })
				.querySelectorAll("svg"),
		).toHaveLength(1);
		expect(
			screen
				.getByRole("button", { name: "Export project" })
				.querySelectorAll("svg"),
		).toHaveLength(1);
	});
});
