## ADDED Requirements

### Requirement: Command Palette Header Entry
The header SHALL display a command palette trigger button that opens the command palette when clicked.

#### Scenario: Command palette button visible
- **WHEN** the header is displayed
- **THEN** a command palette trigger button is visible with a keyboard shortcut hint (⌘K)

#### Scenario: Click opens command palette
- **WHEN** user clicks the command palette button
- **THEN** the command palette dialog opens

### Requirement: Layout Toggle Keyboard Shortcuts
The application SHALL provide keyboard shortcuts for toggling panel visibility.

#### Scenario: Toggle chat via keyboard
- **WHEN** user presses ⌘1
- **THEN** the chat panel visibility is toggled

#### Scenario: Toggle console via keyboard
- **WHEN** user presses ⌘2
- **THEN** the console panel visibility is toggled

### Requirement: Layout Actions in Command Palette
Layout toggle actions SHALL be registered in the command palette for discoverability.

#### Scenario: Toggle chat action in palette
- **WHEN** user opens the command palette
- **THEN** a "Toggle Chat Panel" action is available with shortcut hint ⌘1

#### Scenario: Toggle console action in palette
- **WHEN** user opens the command palette
- **THEN** a "Toggle Console Panel" action is available with shortcut hint ⌘2
