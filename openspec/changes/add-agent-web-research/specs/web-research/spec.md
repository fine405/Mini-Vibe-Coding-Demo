## ADDED Requirements

### Requirement: Bounded Web and Weather Research Tools

The Agent SHALL expose only the approved read-only `web_search` and `weather_search` Research tools for live external information.

#### Scenario: User asks for current web information
- **WHEN** the user asks for information that may be time-sensitive or external to the workspace
- **THEN** the Agent can call `web_search` through the configured fixed search provider
- **AND** the tool returns at most five bounded results with validated original sources

#### Scenario: User asks about weather
- **WHEN** the user asks for current weather or a forecast for one location
- **THEN** the Agent can call `weather_search` to resolve the location and return current conditions plus at most seven forecast days
- **AND** the result includes a visible Open-Meteo source and attribution

#### Scenario: An unapproved network operation is attempted
- **WHEN** the Agent needs an arbitrary URL, authenticated site, write operation or unsupported external service
- **THEN** no generic network tool is available
- **AND** the Agent explains the limitation without inventing results

### Requirement: Source-Aware Research Tool Timeline

The browser SHALL render Research Tool calls in real stream order and show validated web search sources as soon as their Tool output is available.

#### Scenario: Web search is running
- **WHEN** `web_search` input begins streaming or becomes available
- **THEN** the timeline displays its real Tool name, state and query
- **AND** the Tool card is open by default

#### Scenario: Web search sources arrive before the answer completes
- **WHEN** a completed `web_search` Tool output contains valid sources while the Assistant answer is still streaming
- **THEN** the same Tool card immediately displays source titles, hostnames and summaries
- **AND** the UI does not synthesize hidden reasoning or citation URLs

#### Scenario: Research Tool fails
- **WHEN** either Research Tool returns an error
- **THEN** the same Tool card displays a sanitized actionable error
- **AND** no invalid source is added to the final citation collection

### Requirement: Aggregated Answer Citations

Every Assistant message with valid Research Tool sources SHALL end with a deduplicated citation count whose disclosure contains safe, inspectable original links.

#### Scenario: Answer uses external sources
- **WHEN** one or more completed Research Tool outputs contain valid sources
- **THEN** the Assistant message ends with an `N sources` trigger after all reasoning, Tool and text parts
- **AND** duplicate normalized URLs count only once in stable first-seen order
- **AND** at most ten citations are exposed per Assistant message

#### Scenario: User inspects the citation count
- **WHEN** the user hovers, keyboard-focuses or clicks the citation trigger
- **THEN** a bounded list displays each source title, hostname, optional summary and icon fallback
- **AND** every original URL is available as a keyboard-accessible new-window link with safe rel attributes

#### Scenario: No verified source is available
- **WHEN** Research Tools fail, return no sources or return malformed sources
- **THEN** no citation trigger is rendered
- **AND** the Agent does not fabricate citation URLs

### Requirement: External Research Security and Limits

Research tools MUST keep credentials server-only, restrict outbound services, propagate cancellation and bound all external inputs and outputs.

#### Scenario: Browser bundle is built
- **WHEN** the production client bundle is inspected
- **THEN** `TAVILY_API_KEY` and external HTTP adapter code are absent
- **AND** only validated source data crosses the UI message stream

#### Scenario: External operation exceeds its bound
- **WHEN** an upstream request times out, is rate-limited, is aborted or exceeds the response limit
- **THEN** execution stops without an automatic billable retry
- **AND** the UI receives a sanitized actionable Tool error

#### Scenario: Search content contains instructions
- **WHEN** a search result contains prompt-like instructions
- **THEN** the Agent treats it only as untrusted reference data
- **AND** it does not override system rules, expose secrets or gain additional tools

### Requirement: Research-Only Agent Completion

The coding Agent SHALL answer research-only requests without creating or finalizing a workspace ChangeSet.

#### Scenario: User requests information without code changes
- **WHEN** the user asks only for web or weather information
- **THEN** the Agent may use the relevant Research Tool and return a sourced answer
- **AND** it does not call workspace mutation tools or `finalize_changes`

#### Scenario: Coding request needs external research
- **WHEN** a coding task requires current documentation or external facts
- **THEN** the Agent may research before editing the shadow workspace
- **AND** only actual workspace changes are submitted through `finalize_changes`
- **AND** research sources remain visible with the resulting response

### Requirement: Deterministic Research Testing

The Research gateway, tools, stream and citation UI SHALL be testable without real external credentials or network calls.

#### Scenario: CI runs Research tests
- **WHEN** automated tests run without Tavily credentials or external network access
- **THEN** fake gateway and mocked fetch responses exercise successful and failed Tool executions deterministically
- **AND** no third-party quota is consumed
- **AND** Tool trace ordering and citation interactions are verified
