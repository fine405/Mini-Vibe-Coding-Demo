## ADDED Requirements

### Requirement: Real Streaming Coding Agent

The system SHALL execute user coding requests through a real Mastra Agent and stream AI SDK v6 UI message parts to the browser.

#### Scenario: User sends a coding request
- **WHEN** a configured Provider/model and valid workspace snapshot are submitted
- **THEN** Mastra starts the coding Agent with that model
- **AND** text and tool events stream incrementally to the browser
- **AND** the UI does not simulate timing or load a trigger-matched JSON patch

#### Scenario: Provider returns an error
- **WHEN** a model request fails
- **THEN** the stream terminates in a recoverable error state
- **AND** the user sees a sanitized actionable message
- **AND** server infrastructure details and secrets are not exposed

### Requirement: Agent Workspace Tools

The coding Agent SHALL have typed tools to list, read, search, write and delete files in a request-scoped shadow workspace and to finalize a ChangeSet.

#### Scenario: Agent inspects before editing
- **WHEN** the Agent needs to modify an existing file
- **THEN** it can list, search and read the shadow workspace
- **AND** write validation enforces read-before-write for that file

#### Scenario: Agent edits files
- **WHEN** the Agent calls write or delete tools with valid inputs
- **THEN** only the shadow workspace is changed
- **AND** the browser workspace remains unchanged

#### Scenario: Agent finalizes changes
- **WHEN** the Agent calls the terminal finalize tool
- **THEN** the system returns a validated WorkspaceChangeSet comparing the base and shadow workspaces
- **AND** no file is committed to the browser workspace

### Requirement: Bounded Agent Loop

The system MUST bound Agent execution by tool schemas, step count, output limits and request cancellation.

#### Scenario: Agent reaches the terminal tool
- **WHEN** a valid ChangeSet is finalized
- **THEN** the Agent tool loop stops without unnecessary extra model steps

#### Scenario: Agent exceeds the step budget
- **WHEN** the Agent does not finish within the configured maximum steps
- **THEN** execution stops
- **AND** the UI receives a recoverable incomplete-run state

#### Scenario: User stops generation
- **WHEN** the user activates Stop during a run
- **THEN** the request abort signal cancels model and tool work
- **AND** the shadow workspace is discarded

### Requirement: Agent Least Privilege

The coding Agent MUST NOT receive shell, arbitrary network, host filesystem, deployment or direct browser-workspace mutation capabilities in the initial implementation.

#### Scenario: Agent enumerates available tools
- **WHEN** an Agent run begins
- **THEN** only the approved bounded workspace tools are available
- **AND** no shell or arbitrary fetch tool is present

#### Scenario: Tool attempts path escape
- **WHEN** a tool input contains an absolute host path, parent traversal, NUL or a blocked secret path
- **THEN** the tool rejects the operation
- **AND** no data outside the shadow workspace is read or written

### Requirement: Agent Stream Rendering

The browser SHALL render Agent text, Markdown, reasoning and tool states with AI Elements components compatible with AI SDK v6 `UIMessage` parts.

#### Scenario: Markdown streams incrementally
- **WHEN** the Agent streams Markdown text
- **THEN** the UI renders formatted content without exposing raw Markdown syntax
- **AND** partial streaming updates remain readable

#### Scenario: Tool call streams
- **WHEN** a tool input or output part is received
- **THEN** the UI displays its name, state and bounded data
- **AND** a finalized ChangeSet is handed to Change Review through a typed renderer

### Requirement: Deterministic Agent Testing

The Agent and streaming interfaces SHALL be testable without a paid Provider key.

#### Scenario: CI executes Agent tests
- **WHEN** automated tests run without Provider environment variables
- **THEN** an AI SDK-compatible mock model drives the Mastra tool loop
- **AND** the Hono stream and resulting ChangeSet are verified deterministically

