# File Tree UX Improvements

## ADDED Requirements

### Requirement: Rename Action
The system SHALL allow renaming files via inline editing.

#### Scenario: Inline rename triggered
- **WHEN** user selects "Rename" from the context menu
- **THEN** the file name label is replaced by an editable input field
- **AND** the current file name is selected

#### Scenario: Confirm inline rename
- **WHEN** user presses Enter in the inline input
- **THEN** the file is renamed and the input reverts to a label

#### Scenario: Cancel inline rename
- **WHEN** user presses Escape or clicks outside the inline input
- **THEN** the rename is cancelled and the input reverts to the original label

### Requirement: Delete Action
The system SHALL prompt for confirmation before deleting a file using a styled dialog.

#### Scenario: Delete confirmation dialog
- **WHEN** user selects "Delete" from the context menu
- **THEN** a styled dialog appears asking for confirmation
- **AND** the dialog shows the name of the file to be deleted

#### Scenario: Confirm delete
- **WHEN** user clicks "Delete" in the confirmation dialog
- **THEN** the file is deleted and the dialog closes

#### Scenario: Cancel delete
- **WHEN** user clicks "Cancel" in the confirmation dialog
- **THEN** the dialog closes without deleting the file
