## ADDED Requirements

### Requirement: Console Output Display
The system SHALL display console output from the preview iframe in a dedicated panel.

#### Scenario: Display console.log
- **WHEN** the preview app calls console.log with a message
- **THEN** the message appears in the console panel with "log" styling

#### Scenario: Display console.error
- **WHEN** the preview app calls console.error with a message
- **THEN** the message appears in the console panel with "error" styling (red)

#### Scenario: Display console.warn
- **WHEN** the preview app calls console.warn with a message
- **THEN** the message appears in the console panel with "warn" styling (yellow)

### Requirement: Collapsible Console Panel
The system SHALL provide a collapsible console panel in the preview area.

#### Scenario: Collapse console
- **WHEN** user clicks the collapse toggle on the console panel
- **THEN** the console panel collapses to show only the header

#### Scenario: Expand console
- **WHEN** user clicks the expand toggle on a collapsed console panel
- **THEN** the console panel expands to show all console output

### Requirement: Console Controls
The system SHALL provide controls for managing console output.

#### Scenario: Clear console
- **WHEN** user clicks the clear button in the console panel
- **THEN** all console entries are removed from the display
