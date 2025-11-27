# File Tree Specification

## Purpose
Provides a hierarchical file browser with context menu actions, inline editing, and keyboard shortcuts for file management.
## Requirements
### Requirement: Context Menu Actions
The file tree SHALL support right-click context menu actions for file items.

#### Scenario: Right-click on file
- **WHEN** user right-clicks on a file item in the file tree
- **THEN** a context menu appears with actions like "Rename" and "Delete"

#### Scenario: Dismiss context menu
- **WHEN** user clicks outside the context menu
- **THEN** the context menu disappears

### Requirement: Rename Action
The system SHALL allow renaming files via inline editing, context menu, or shortcuts.

#### Scenario: Trigger rename via Enter key
- **WHEN** a file is selected
- **AND** user presses `Enter` key
- **THEN** the file enters rename mode (inline editing)
- **AND** the input field is focused with filename portion selected (excluding extension)

#### Scenario: Inline rename triggered
- **WHEN** user selects "Rename" from the context menu
- **THEN** the file name label is replaced by an editable input field
- **AND** the current file name is selected

#### Scenario: Auto-focus on rename with filename highlight
- **WHEN** rename mode is activated (via any method)
- **THEN** the inline input field automatically receives focus
- **AND** only the filename portion (excluding extension) is selected/highlighted

#### Scenario: Confirm inline rename
- **WHEN** user presses Enter in the inline input
- **THEN** the file is renamed and the input reverts to a label

#### Scenario: Cancel inline rename
- **WHEN** user presses Escape
- **THEN** the rename is cancelled and the input reverts to the original label

#### Scenario: Save on blur
- **WHEN** rename mode is active
- **AND** user clicks outside the input field (blur)
- **THEN** the rename is automatically saved

### Requirement: Delete Action
The system SHALL prompt for confirmation before deleting a file using a styled dialog, triggered via context menu or shortcuts.

#### Scenario: Delete confirmation dialog
- **WHEN** user selects "Delete" from the context menu
- **THEN** a styled dialog appears asking for confirmation
- **AND** the dialog shows the name of the file to be deleted

#### Scenario: Trigger delete via shortcut
- **WHEN** a file is selected
- **AND** user presses `Cmd+Backspace` (Mac)
- **THEN** the delete confirmation dialog appears

#### Scenario: Confirm delete
- **WHEN** user clicks "Delete" in the confirmation dialog
- **THEN** the file is deleted and the dialog closes

#### Scenario: Cancel delete
- **WHEN** user clicks "Cancel" in the confirmation dialog
- **THEN** the dialog closes without deleting the file

### Requirement: ZIP Export
The system SHALL support exporting the project as a ZIP archive with proper directory structure.

#### Scenario: Export project as ZIP
- **WHEN** user selects "Export as ZIP" from the export dropdown
- **THEN** a ZIP file is downloaded containing all project files
- **AND** the ZIP preserves the directory structure (e.g., `/components/TodoInput.js`)

#### Scenario: ZIP file naming
- **WHEN** user exports as ZIP
- **THEN** the downloaded file is named `{projectName}-{timestamp}.zip`

### Requirement: ZIP Import
The system SHALL support importing projects from ZIP archives.

#### Scenario: Import project from ZIP
- **WHEN** user selects "Import ZIP" from the import dropdown
- **AND** user selects a valid ZIP file
- **THEN** the ZIP contents are extracted and loaded into the virtual file system
- **AND** the file tree displays the imported files

#### Scenario: Invalid ZIP handling
- **WHEN** user attempts to import an invalid or corrupted ZIP file
- **THEN** an error toast is displayed with a descriptive message

### Requirement: Export Format Dropdown
The system SHALL provide a dropdown menu for selecting export format instead of a single button.

#### Scenario: Export dropdown options
- **WHEN** user clicks the Export dropdown in the header
- **THEN** a menu appears with options: "Export as JSON" and "Export as ZIP"

#### Scenario: Export as JSON from dropdown
- **WHEN** user selects "Export as JSON" from the dropdown
- **THEN** the project is exported in JSON format (existing behavior)

### Requirement: Import Format Dropdown
The system SHALL provide a dropdown menu for selecting import format instead of a single button.

#### Scenario: Import dropdown options
- **WHEN** user clicks the Import dropdown in the header
- **THEN** a menu appears with options: "Import JSON" and "Import ZIP"

#### Scenario: Import JSON from dropdown
- **WHEN** user selects "Import JSON" from the dropdown
- **THEN** a file picker opens accepting `.json` files (existing behavior)

#### Scenario: Import ZIP from dropdown
- **WHEN** user selects "Import ZIP" from the dropdown
- **THEN** a file picker opens accepting `.zip` files

