## ADDED Requirements

### Requirement: Bounded Web Research Toolset

The coding Agent SHALL provide typed, read-only tools for general web search, reading one public webpage, weather lookup and GitHub public search through fixed server-side upstream services.

#### Scenario: User asks for current web information
- **WHEN** the user asks a question that requires current or externally sourced information
- **THEN** the Agent can call `web_search` with a bounded query and result count
- **AND** the tool returns normalized snippets and sources from the configured search provider

#### Scenario: User supplies a webpage URL
- **WHEN** the user asks the Agent to inspect one valid public HTTP(S) webpage
- **THEN** the Agent can call `read_webpage` through the fixed Reader service
- **AND** the tool returns bounded page content and the original page as a source

#### Scenario: User asks about weather
- **WHEN** the user asks for current weather or a forecast for one location
- **THEN** the Agent can resolve the location and return current conditions plus at most seven forecast days
- **AND** the response includes the weather data source and attribution

#### Scenario: User asks about GitHub
- **WHEN** the user asks to find public GitHub repositories, issues, pull requests or code
- **THEN** the Agent can query the supported GitHub REST search endpoint
- **AND** every result links to its public `github.com` original page
- **AND** private repository data is not returned

### Requirement: Visible Web Tool Execution Trace

The browser SHALL render each Web Tool call in stream order with its name, execution state, input, bounded output and sanitized error.

#### Scenario: Web Tool is running
- **WHEN** a Web Tool input begins streaming or becomes available
- **THEN** the message timeline displays the Tool name, pending/running state and current input
- **AND** the Tool card is open by default while active

#### Scenario: Web Tool completes
- **WHEN** the Web Tool returns output or an error
- **THEN** the same Tool card displays the completed/error state and inspectable result
- **AND** the UI does not replace the real Tool part with simulated status text

### Requirement: Structured Clickable Citations

Every successful Web Tool output SHALL expose validated sources, and every Assistant message using those outputs SHALL end with deduplicated clickable citations.

#### Scenario: Answer uses external sources
- **WHEN** one or more completed Web Tool outputs contain valid sources
- **THEN** the Assistant message renders a citation footer after its answer and Tool parts
- **AND** each citation displays an icon, title, hostname and safe clickable original URL
- **AND** duplicate normalized URLs appear only once

#### Scenario: Source favicon is unavailable
- **WHEN** a source does not provide a valid icon or the favicon fails to load
- **THEN** the citation displays a local generic link icon
- **AND** the title and original URL remain accessible

#### Scenario: No verified source is available
- **WHEN** a Web Tool fails or returns no valid sources
- **THEN** the Agent does not fabricate citation URLs
- **AND** the answer clearly states that no verified source was available

### Requirement: External Service Security and Limits

Web Research tools MUST keep credentials server-only, restrict outbound services and target URLs, propagate cancellation and bound all external inputs and outputs.

#### Scenario: Browser bundle is built
- **WHEN** the production client bundle is inspected
- **THEN** Tavily, Jina and GitHub credentials are absent
- **AND** external-service client code remains server-only

#### Scenario: Unsafe webpage target is requested
- **WHEN** `read_webpage` receives a non-HTTP(S) URL, URL credentials, localhost or a private/link-local/reserved IP target
- **THEN** the tool rejects the input before calling the Reader service
- **AND** no direct request is made to the target host

#### Scenario: External operation exceeds its bound
- **WHEN** an upstream request times out, is rate-limited, is aborted or exceeds the configured result/content limit
- **THEN** execution stops without an automatic billable retry
- **AND** the UI receives a sanitized actionable Tool error

#### Scenario: Retrieved content contains instructions
- **WHEN** search, webpage or GitHub content contains prompt-like instructions
- **THEN** the Agent treats that content only as untrusted reference data
- **AND** it does not override system rules, expose secrets or gain additional tools

### Requirement: Research-Only Agent Completion

The coding Agent SHALL answer research-only requests without creating or finalizing a workspace ChangeSet.

#### Scenario: User requests information without code changes
- **WHEN** the user asks only for weather, web, webpage or GitHub information
- **THEN** the Agent may use the relevant read-only tools and return a sourced answer
- **AND** it does not call workspace mutation tools or `finalize_changes`

#### Scenario: Coding request needs external research
- **WHEN** a coding task requires current documentation or external facts
- **THEN** the Agent may research before editing the shadow workspace
- **AND** only actual workspace changes are submitted through `finalize_changes`
- **AND** citations from the research remain visible with the resulting response

### Requirement: Deterministic Web Research Testing

The Web Research clients, tools, stream and citation UI SHALL be testable without real external credentials or network calls.

#### Scenario: CI runs Web Research tests
- **WHEN** automated tests run without Tavily, Jina or GitHub credentials
- **THEN** mocked fetch responses exercise successful and failed Tool executions deterministically
- **AND** no third-party quota is consumed
- **AND** Tool trace ordering and citation rendering are verified
