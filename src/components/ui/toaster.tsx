import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			theme="dark"
			className="toaster group"
			toastOptions={{
				classNames: {
					toast:
						"group toast group-[.toaster]:bg-neutral-900 group-[.toaster]:text-neutral-100 group-[.toaster]:border-neutral-700 group-[.toaster]:shadow-lg",
					description: "group-[.toast]:text-neutral-400",
					actionButton: "group-[.toast]:bg-blue-500 group-[.toast]:text-white",
					cancelButton:
						"group-[.toast]:bg-neutral-800 group-[.toast]:text-neutral-300",
					error: "group-[.toast]:bg-red-900/20 group-[.toast]:border-red-700",
					success:
						"group-[.toast]:bg-green-900/20 group-[.toast]:border-green-700",
					warning:
						"group-[.toast]:bg-yellow-900/20 group-[.toast]:border-yellow-700",
					info: "group-[.toast]:bg-blue-900/20 group-[.toast]:border-blue-700",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
