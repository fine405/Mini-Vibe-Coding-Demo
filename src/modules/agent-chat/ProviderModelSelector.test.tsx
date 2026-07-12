import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProviderModelSelector } from "@/modules/agent-chat/ProviderModelSelector";
import type { PublicProvider } from "@/modules/providers/types";

const providers: PublicProvider[] = [
	{
		id: "openai",
		name: "OpenAI",
		description: "OpenAI models",
		configured: false,
		missingEnvVars: ["OPENAI_API_KEY"],
		defaultModelId: "openai/gpt-5.4",
		models: [
			{ id: "openai/gpt-5.4", label: "GPT-5.4", description: "Default" },
		],
	},
	{
		id: "deepseek",
		name: "DeepSeek",
		description: "DeepSeek models",
		configured: true,
		missingEnvVars: [],
		defaultModelId: "deepseek/deepseek-chat",
		models: [
			{
				id: "deepseek/deepseek-chat",
				label: "DeepSeek Chat",
				description: "Default",
			},
		],
	},
];

describe("ProviderModelSelector", () => {
	it("shows unavailable providers as disabled and selects configured models", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(
			<ProviderModelSelector
				onSelect={onSelect}
				providers={providers}
				selection={{
					providerId: "deepseek",
					modelId: "deepseek/deepseek-chat",
				}}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Select AI provider and model" }),
		);
		const unavailable = screen.getByRole("option", {
			name: "openai logo GPT-5.4 Default",
		});
		const available = screen.getByRole("option", {
			name: "deepseek logo DeepSeek Chat Default",
		});

		expect(unavailable).toHaveAttribute("data-disabled", "true");
		expect(available).not.toHaveAttribute("data-disabled", "true");
		await user.click(available);
		expect(onSelect).toHaveBeenCalledWith({
			providerId: "deepseek",
			modelId: "deepseek/deepseek-chat",
		});
	});
});
