# File Tree Interaction

## ADDED Requirements

### Requirement: Context Menu Actions
The file tree SHALL support right-click context menu actions for file items.

#### Scenario: Right-click on file
- **WHEN** user right-clicks on a file item in the file tree
- **THEN** a context menu appears with actions like "Rename" and "Delete"

#### Scenario: Dismiss context menu
- **WHEN** user clicks outside the context menu
- **THEN** the context menu disappears

### Requirement: Rename Action
The system SHALL allow renaming files via the context menu.

#### Scenario: Rename file
- **WHEN** user selects "Rename" from the context menu
- **THEN** the file enters rename mode (inline edit or modal)

### Requirement: Delete Action
The system SHALL allow deleting files via the context menu.

#### Scenario: Delete file
- **WHEN** user selects "Delete" from the context menu
- **THEN** the file is deleted (optionally with confirmation)

