# File Tree Shortcuts

## ADDED Requirements

### Requirement: Rename Action
The system SHALL allow renaming files via inline editing, context menu, or shortcuts.

#### Scenario: Trigger rename via Enter key
- **WHEN** a file is selected
- **AND** user presses `Enter` key
- **THEN** the file enters rename mode (inline editing)
- **AND** the input field is focused with filename portion selected (excluding extension)

#### Scenario: Auto-focus on rename with filename highlight
- **WHEN** rename mode is activated (via any method)
- **THEN** the inline input field automatically receives focus
- **AND** only the filename portion (excluding extension) is selected/highlighted

#### Scenario: Save on blur
- **WHEN** rename mode is active
- **AND** user clicks outside the input field (blur)
- **THEN** the rename is automatically saved

### Requirement: Delete Action
The system SHALL prompt for confirmation before deleting a file, triggered via context menu or shortcuts.

#### Scenario: Trigger delete via shortcut
- **WHEN** a file is selected
- **AND** user presses `Cmd+Backspace` (Mac)
- **THEN** the delete confirmation dialog appears
