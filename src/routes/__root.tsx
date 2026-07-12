import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "@/index.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1.0",
			},
			{
				name: "theme-color",
				content: "#0a0a0a",
			},
			{
				title: "Mini Lovable Agent Studio",
			},
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	notFoundComponent: () => <main>页面不存在</main>,
	shellComponent: RootDocument,
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html
			lang="zh-CN"
			className="dark"
			data-theme="dark"
			suppressHydrationWarning
		>
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
