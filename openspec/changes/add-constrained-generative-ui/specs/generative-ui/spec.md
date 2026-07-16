## ADDED Requirements

### Requirement: Constrained Generative UI Catalog

The system SHALL allow the Assistant to compose inline interfaces only from the approved `Stack`, `Grid`, `Card`, `Text`, `Metric`, `DataTable`, `Chart`, `Button`, `Timeline` and `MermaidDiagram` Catalog components.

#### Scenario: Assistant generates a supported interface
- **WHEN** a read-only answer benefits materially from structured visual presentation
- **THEN** the Assistant may emit a json-render SpecStream using only approved component types and props
- **AND** the browser renders those elements with native project React components and theme tokens

#### Scenario: Assistant does not need a generated interface
- **WHEN** plain text is sufficient or the Agent is completing a workspace mutation task
- **THEN** the Assistant can return the existing text, reasoning and Tool parts without a spec
- **AND** no Generative UI renderer is mounted for that message

#### Scenario: Spec requests an unapproved escape hatch
- **WHEN** a spec contains an unknown component, arbitrary class/style, raw HTML, executable code or unsupported action
- **THEN** the request is rejected or rendered with a bounded fallback
- **AND** no generated code is executed

### Requirement: Progressive Inline Spec Rendering

The system SHALL transform fenced json-render JSONL patches into AI SDK `data-spec` message parts and progressively render the current valid spec at its real position in the Assistant message.

#### Scenario: Text and Tool parts surround a spec
- **WHEN** an Assistant stream contains prose, Tool calls and a fenced SpecStream
- **THEN** all non-spec parts retain their original order and existing rendering
- **AND** one aggregated generated interface appears at the position of the first spec part

#### Scenario: Valid patches arrive incrementally
- **WHEN** additional complete JSONL patch lines arrive for the same message
- **THEN** the existing generated interface updates without duplicating the Renderer
- **AND** the user does not see raw JSONL or fence delimiters

#### Scenario: Generated spec is malformed
- **WHEN** one or more spec lines cannot be parsed or the final tree is not renderable
- **THEN** the generated interface fails locally with a bounded fallback
- **AND** ordinary text, Tool output, Research citations and ChangeSet review remain available

### Requirement: Controlled Data and Interaction Components

Generated data and interaction components MUST enforce bounded data sizes and SHALL only modify state owned by their Renderer instance.

#### Scenario: Data table or chart exceeds its bound
- **WHEN** generated data contains more than the supported rows, columns, points or series
- **THEN** the Renderer truncates or rejects the excess deterministically
- **AND** it does not execute generated formatter code

#### Scenario: Generated button is pressed
- **WHEN** a Button invokes an approved `setState` or `toggleState` action
- **THEN** only the current generated interface state is updated
- **AND** no Workspace, network, navigation, IndexedDB or Preview operation is invoked

#### Scenario: Timeline is rendered
- **WHEN** a Timeline contains valid bounded items
- **THEN** it displays a vertical accessible sequence using the approved status vocabulary
- **AND** model-controlled CSS is not applied

### Requirement: Restricted Mermaid Rendering

The system MUST render Mermaid only through the existing strict-mode open-source renderer and a pre-render input allowlist.

#### Scenario: Supported Mermaid diagram is provided
- **WHEN** Mermaid source is within the size bound and starts with an approved diagram type
- **THEN** the browser renders it through the existing strict Mermaid plugin
- **AND** the diagram inherits the chat surface sizing and theme constraints

#### Scenario: Mermaid source contains dangerous capabilities
- **WHEN** Mermaid source contains an init directive, click/callback behavior, explicit external link, HTML tag or unsupported diagram type
- **THEN** rendering is refused with a controlled error state
- **AND** no link, callback, script or raw HTML is activated

#### Scenario: Mermaid syntax is invalid
- **WHEN** the strict Mermaid parser cannot render otherwise allowed source
- **THEN** the component shows a bounded accessible failure message
- **AND** the rest of the generated interface remains interactive

### Requirement: Generative UI Compatibility and Verification

The Generative UI integration SHALL preserve the existing AI SDK v6 message contract and be deterministically testable without a live model call.

#### Scenario: Existing message types are streamed
- **WHEN** text-only, reasoning, Research Tool, workspace Tool or finalize output is produced
- **THEN** it preserves its current state, metadata and renderer behavior through the json-render transform

#### Scenario: CI verifies the feature
- **WHEN** automated checks run without Provider credentials
- **THEN** fixtures exercise SpecStream transformation, Catalog validation, component rendering, actions and Mermaid policy deterministically
- **AND** typecheck, lint, unit tests and production build pass

### Requirement: Generative UI Prompt Discovery

The empty Chat surface SHALL provide separate `Starter` and `Generative UI` suggestion tabs, and MUST require explicit user submission after a suggestion is selected.

#### Scenario: User switches suggestion category
- **WHEN** the user selects the `Starter` or `Generative UI` tab
- **THEN** the visible suggestions come only from that category
- **AND** the current composer draft is preserved

#### Scenario: User refreshes suggestions
- **WHEN** the user activates the refresh control
- **THEN** the current tab advances to its next deterministic suggestion batch
- **AND** the composer draft and selected tab remain unchanged

#### Scenario: User selects a suggestion
- **WHEN** the user activates any visible suggestion
- **THEN** its complete prompt is placed into the current composer
- **AND** the composer receives focus with the caret at the end of the prompt
- **AND** no chat request is sent until the user explicitly submits

#### Scenario: Generative UI presets cover the approved Catalog
- **WHEN** the `Generative UI` tab is active and its batches are inspected
- **THEN** the presets include representative combined uses of layout, text, metrics, table, bar/line chart, button, timeline and Mermaid components
- **AND** every preset describes a read-only task using supplied or approved Tool data
