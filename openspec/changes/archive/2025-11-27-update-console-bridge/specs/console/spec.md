## MODIFIED Requirements

### Requirement: Console Output Display
The system SHALL display console output from the preview iframe in a dedicated panel using a deterministic bridge that forwards Sandpack console events via `sandpack.listen` and `postMessage`.

#### Scenario: Display console.log
- **WHEN** the preview app calls console.log with a message
- **THEN** the message is forwarded through the bridge and appears in the console panel with "log" styling

#### Scenario: Display console.error
- **WHEN** the preview app calls console.error with a message
- **THEN** the message is forwarded through the bridge and appears in the console panel with "error" styling (red)

#### Scenario: Display console.warn
- **WHEN** the preview app calls console.warn with a message
- **THEN** the message is forwarded through the bridge and appears in the console panel with "warn" styling (yellow)

### Requirement: Console Controls
The system SHALL provide controls for managing console output, including clearing bridged log history and resubscribing when the Sandpack preview restarts.

#### Scenario: Clear console
- **WHEN** user clicks the clear button in the console panel
- **THEN** all bridged console entries are removed from the display

#### Scenario: Handle preview restart
- **WHEN** the Sandpack preview restarts or re-handshakes
- **THEN** the console bridge re-subscribes so new log events continue streaming
