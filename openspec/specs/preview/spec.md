# preview Specification

## Purpose
TBD - created by archiving change refactor-preview-pane. Update Purpose after archive.
## Requirements
### Requirement: Live Preview Display
The system SHALL render a live preview of the virtual project using Sandpack in an iframe.

#### Scenario: Preview renders on file change
- **WHEN** a file in the virtual file system is modified
- **THEN** the preview iframe automatically refreshes to show the updated content

#### Scenario: Preview shows React app
- **WHEN** the virtual file system contains a valid React project
- **THEN** the preview renders the React application

### Requirement: Preview Controls
The system SHALL provide controls for managing the preview.

#### Scenario: Manual refresh
- **WHEN** user clicks the refresh button in the preview header
- **THEN** the preview iframe reloads with current file contents

#### Scenario: Preview-only mode
- **WHEN** the preview pane is displayed
- **THEN** only the preview iframe is shown (no embedded editor)

