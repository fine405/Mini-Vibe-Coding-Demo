import { AlertTriangle, RefreshCw } from "lucide-react";
import React, { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
		this.props.onError?.(error, errorInfo);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="flex items-center justify-center min-h-screen bg-neutral-950 text-neutral-100 p-4">
					<div className="max-w-md w-full bg-neutral-900 border border-neutral-700 rounded-lg p-6 shadow-xl">
						<div className="flex items-center gap-3 mb-4">
							<div className="p-2 bg-red-500/20 rounded-lg">
								<AlertTriangle className="h-6 w-6 text-red-400" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-neutral-100">
									Something went wrong
								</h2>
								<p className="text-sm text-neutral-400">
									An unexpected error occurred
								</p>
							</div>
						</div>

						{this.state.error && (
							<div className="mb-4 p-3 bg-neutral-800 rounded border border-neutral-700">
								<p className="text-xs font-mono text-red-400 break-all">
									{this.state.error.message}
								</p>
							</div>
						)}

						<div className="flex gap-2">
							<button
								type="button"
								onClick={this.handleReset}
								className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
							>
								<RefreshCw className="h-4 w-4" />
								Try Again
							</button>
							<button
								type="button"
								onClick={() => window.location.reload()}
								className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-sm font-medium transition-colors"
							>
								Reload Page
							</button>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
