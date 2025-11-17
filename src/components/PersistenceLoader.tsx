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
			<div className="w-screen h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent mb-4" />
					<p className="text-sm text-neutral-400">Loading workspace...</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
