import { KeyRoundIcon, Settings2Icon, ShieldAlertIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
	EphemeralCredentialStatus,
	EphemeralCredentials,
} from "@/modules/agent-chat/ephemeral-credentials";

interface DemoCredentialSettingsProps {
	status: EphemeralCredentialStatus;
	onSave(credentials: EphemeralCredentials): void;
	onClear(): Promise<void>;
}

function CredentialStatus({ configured }: { configured: boolean }) {
	return (
		<span className="text-[11px] text-muted-foreground">
			{configured
				? "Configured for this page"
				: "Uses server configuration when available"}
		</span>
	);
}

export function DemoCredentialSettings({
	status,
	onSave,
	onClear,
}: DemoCredentialSettingsProps) {
	const [open, setOpen] = useState(false);
	const [deepseekApiKey, setDeepseekApiKey] = useState("");
	const [tavilyApiKey, setTavilyApiKey] = useState("");
	const [clearing, setClearing] = useState(false);
	const hasDraft = Boolean(deepseekApiKey.trim() || tavilyApiKey.trim());
	const hasCredentials = status.deepseekConfigured || status.tavilyConfigured;

	const clearDraft = () => {
		setDeepseekApiKey("");
		setTavilyApiKey("");
	};
	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) clearDraft();
	};
	const handleSave = () => {
		onSave({ deepseekApiKey, tavilyApiKey });
		clearDraft();
		setOpen(false);
	};
	const handleClear = async () => {
		setClearing(true);
		try {
			await onClear();
			clearDraft();
			setOpen(false);
		} finally {
			setClearing(false);
		}
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogTrigger asChild>
				<Button
					aria-label="Demo credential settings"
					className="relative"
					size="icon-sm"
					variant="ghost"
				>
					<Settings2Icon />
					{hasCredentials ? (
						<span
							aria-hidden="true"
							className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-emerald-500"
						/>
					) : null}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<KeyRoundIcon className="size-4" />
						Demo credentials
					</DialogTitle>
					<DialogDescription>
						Temporary BYOK values for this page only. Hosted platform secrets
						remain the safer default.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<div className="flex items-center justify-between gap-3">
							<label className="font-mono text-xs" htmlFor="demo-deepseek-key">
								DEEPSEEK_API_KEY
							</label>
							<CredentialStatus configured={status.deepseekConfigured} />
						</div>
						<Input
							autoComplete="off"
							id="demo-deepseek-key"
							maxLength={512}
							onChange={(event) => setDeepseekApiKey(event.target.value)}
							placeholder={
								status.deepseekConfigured
									? "Enter a new value to replace it"
									: "sk-…"
							}
							spellCheck={false}
							type="password"
							value={deepseekApiKey}
						/>
					</div>

					<div className="space-y-1.5">
						<div className="flex items-center justify-between gap-3">
							<label className="font-mono text-xs" htmlFor="demo-tavily-key">
								TAVILY_API_KEY
							</label>
							<CredentialStatus configured={status.tavilyConfigured} />
						</div>
						<Input
							autoComplete="off"
							id="demo-tavily-key"
							maxLength={512}
							onChange={(event) => setTavilyApiKey(event.target.value)}
							placeholder={
								status.tavilyConfigured
									? "Enter a new value to replace it"
									: "tvly-…"
							}
							spellCheck={false}
							type="password"
							value={tavilyApiKey}
						/>
					</div>

					<div className="flex gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs leading-5 text-amber-800 dark:text-amber-200">
						<ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
						<p>
							Values are not persisted, but page scripts, browser extensions and
							DevTools Network can see them. Use low-quota, revocable demo keys.
							Clearing this page does not revoke a key already sent upstream.
						</p>
					</div>
				</div>

				<DialogFooter className="sm:justify-between">
					<Button
						disabled={!hasCredentials || clearing}
						onClick={() => void handleClear()}
						variant="destructive"
					>
						Clear page credentials
					</Button>
					<div className="flex justify-end gap-2">
						<Button onClick={() => handleOpenChange(false)} variant="outline">
							Cancel
						</Button>
						<Button disabled={!hasDraft || clearing} onClick={handleSave}>
							Save for this page
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
