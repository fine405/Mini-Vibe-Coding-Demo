"use client";

import type { Spec } from "@json-render/react";
import {
	ActionProvider,
	StateProvider,
	useStateStore,
	VisibilityProvider,
} from "@json-render/react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { getToggleStateUpdate } from "@/modules/generative-ui/actions";
import { GeneratedSpecRenderer } from "@/modules/generative-ui/registry";
import { sanitizeGenerativeSpec } from "@/modules/generative-ui/spec-policy";

const EMPTY_STATE: Record<string, unknown> = {};

function LocalActionProvider({ children }: { children: ReactNode }) {
	const { getSnapshot, set } = useStateStore();
	const handlers = useMemo(
		() => ({
			toggleState: (params: Record<string, unknown>) => {
				const update = getToggleStateUpdate(params, getSnapshot());
				if (update) {
					set(update.statePath, update.value);
				}
			},
		}),
		[getSnapshot, set],
	);

	return <ActionProvider handlers={handlers}>{children}</ActionProvider>;
}

export function GenerativeUIRenderer({
	spec,
	loading = false,
}: {
	spec: Spec | null;
	loading?: boolean;
}) {
	const sanitizedSpec = useMemo(
		() => (spec ? sanitizeGenerativeSpec(spec) : null),
		[spec],
	);

	if (!sanitizedSpec) {
		return null;
	}

	return (
		<div className="my-1 min-w-0 max-w-full rounded-xl border border-border bg-background/60 p-3">
			<StateProvider initialState={sanitizedSpec.state ?? EMPTY_STATE}>
				<VisibilityProvider>
					<LocalActionProvider>
						<GeneratedSpecRenderer loading={loading} spec={sanitizedSpec} />
					</LocalActionProvider>
				</VisibilityProvider>
			</StateProvider>
		</div>
	);
}
