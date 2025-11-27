import { useEffect, useState } from "react";
import { useFs } from "@/modules/fs/store";

/**
 * Component that loads persisted workspace on mount
 */
export function PersistenceLoader({ children }: { children: React.ReactNode }) {
	const { loadFromPersistence } = useFs();
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadData = async () => {
			try {
				const loaded = await loadFromPersistence();
				if (loaded) {
					console.log("✅ Workspace loaded from IndexedDB");
				} else {
					console.log("ℹ️ No saved workspace found, using defaults");
				}
			} catch (error) {
				console.error("Failed to load workspace:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [loadFromPersistence]);

	if (isLoading) {
		return (
			<div className="w-screen h-screen bg-bg-primary flex items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					{/* Logo */}
					<div className="flex items-center gap-2 animate-pulse">
						<img
							src="https://lovable.dev/icon.svg?9e0c9b5bb1bae062"
							alt="Lovable"
							className="h-8 w-8"
						/>
						<span className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
							Mini Lovable
						</span>
					</div>
					{/* Loading indicator */}
					<div className="flex items-center gap-1">
						<div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce [animation-delay:-0.3s]" />
						<div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
						<div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
					</div>
					<p className="text-xs text-fg-muted">Loading workspace...</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
