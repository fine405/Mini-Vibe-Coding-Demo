"use client";

import { type DataPart, useJsonRenderMessage } from "@json-render/react";
import type { UIMessage } from "ai";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { GenerativeUIRenderer } from "@/modules/generative-ui/GenerativeUIRenderer";

class GenerativeUIErrorBoundary extends Component<
	{ children: ReactNode; resetKey: string },
	{ failed: boolean }
> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch(_error: Error, _info: ErrorInfo) {
		// Generated UI failures are isolated here; model content is intentionally
		// not logged because it may contain workspace or research data.
	}

	componentDidUpdate(previous: { resetKey: string }) {
		if (this.state.failed && previous.resetKey !== this.props.resetKey) {
			this.setState({ failed: false });
		}
	}

	render() {
		if (this.state.failed) {
			return (
				<div
					className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
					role="alert"
				>
					The generated interface could not be rendered.
				</div>
			);
		}
		return this.props.children;
	}
}

export function GenerativeUIMessage({
	parts,
	isStreaming,
}: {
	parts: UIMessage["parts"];
	isStreaming: boolean;
}) {
	const { spec, hasSpec } = useJsonRenderMessage(parts as DataPart[]);
	if (!hasSpec || !spec) {
		return null;
	}

	const resetKey = `${parts.length}:${spec.root}:${Object.keys(spec.elements).length}`;
	return (
		<section aria-label="Generated interface">
			<GenerativeUIErrorBoundary resetKey={resetKey}>
				<GenerativeUIRenderer loading={isStreaming} spec={spec} />
			</GenerativeUIErrorBoundary>
		</section>
	);
}
