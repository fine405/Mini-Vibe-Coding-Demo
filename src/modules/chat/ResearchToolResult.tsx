import {
	Source,
	Sources,
	SourcesContent,
	SourcesTrigger,
} from "@/components/ai-elements/sources";
import type { WebSource } from "@/modules/agent-chat/research";
import {
	parseResearchToolOutput,
	type ResearchToolResult as ResearchToolResultData,
} from "@/modules/agent-chat/research";

function ResearchSources({
	label,
	sources,
}: {
	label: string;
	sources: WebSource[];
}) {
	if (sources.length === 0) {
		return (
			<p className="text-muted-foreground text-xs" role="status">
				No verified sources found.
			</p>
		);
	}

	return (
		<ul aria-label={label} className="space-y-0.5">
			{sources.map((source) => (
				<Source
					description={source.snippet}
					href={source.url}
					icon={source.icon}
					key={source.url}
					title={source.title}
				/>
			))}
		</ul>
	);
}

function WebSearchResult({
	result,
}: {
	result: Extract<ResearchToolResultData, { kind: "web" }>;
}) {
	return (
		<div className="space-y-2">
			<p className="text-muted-foreground text-xs">
				Search: “{result.data.query}”
			</p>
			<h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
				Sources
			</h4>
			<ResearchSources label="Search sources" sources={result.data.sources} />
		</div>
	);
}

function WeatherSearchResult({
	result,
}: {
	result: Extract<ResearchToolResultData, { kind: "weather" }>;
}) {
	const { current, forecast, location, sources, units } = result.data;

	return (
		<div className="space-y-3">
			<div className="rounded-lg bg-muted/50 p-3">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="font-medium">{location.name}</p>
						<p className="text-muted-foreground text-xs">{current.condition}</p>
					</div>
					<p className="font-semibold text-xl">
						{current.temperature} {units.temperature}
					</p>
				</div>
				<div className="mt-3 grid grid-cols-3 gap-2 text-xs">
					<span>
						Feels {current.apparentTemperature} {units.temperature}
					</span>
					<span>
						Wind {current.windSpeed} {units.windSpeed}
					</span>
					<span>
						Rain {current.precipitation} {units.precipitation}
					</span>
				</div>
				<ul aria-label="Forecast" className="mt-3 divide-y text-xs">
					{forecast.map((period) => (
						<li className="flex justify-between gap-3 py-1.5" key={period.date}>
							<span>{period.date}</span>
							<span>
								{period.temperatureMax} / {period.temperatureMin}{" "}
								{units.temperature}
							</span>
						</li>
					))}
				</ul>
			</div>
			<ResearchSources label="Weather source" sources={sources} />
		</div>
	);
}

export function ResearchToolResult({
	output,
	toolName,
}: {
	output: unknown;
	toolName: string;
}) {
	const result = parseResearchToolOutput(toolName, output);
	if (!result) return null;
	return result.kind === "web" ? (
		<WebSearchResult result={result} />
	) : (
		<WeatherSearchResult result={result} />
	);
}

export function ResearchCitationFooter({ sources }: { sources: WebSource[] }) {
	if (sources.length === 0) return null;

	return (
		<div className="mt-1 border-t pt-2">
			<Sources>
				<SourcesTrigger count={sources.length} />
				<SourcesContent>
					<ul aria-label="Sources" className="space-y-0.5">
						{sources.map((source) => (
							<Source
								description={source.snippet}
								href={source.url}
								icon={source.icon}
								key={source.url}
								title={source.title}
							/>
						))}
					</ul>
				</SourcesContent>
			</Sources>
		</div>
	);
}
