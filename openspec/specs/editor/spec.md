# editor Specification

## Purpose
TBD - created by archiving change add-code-editor. Update Purpose after archive.
## Requirements
### Requirement: Code Editor Display
The system SHALL provide a Monaco-based code editor in the middle pane for editing virtual files.

#### Scenario: Open file in editor
- **WHEN** user clicks a file in the file tree
- **THEN** the file opens in the Monaco editor with syntax highlighting based on file extension

#### Scenario: Edit file content
- **WHEN** user types in the editor
- **THEN** the content is updated in the virtual file system
- **AND** the file status changes to "modified" if content differs from original

### Requirement: Editor Tabs
The system SHALL provide a tab bar for managing multiple open files.

#### Scenario: Open multiple files
- **WHEN** user clicks different files in the file tree
- **THEN** each file opens in a new tab
- **AND** the most recently opened file is active

#### Scenario: Close tab
- **WHEN** user clicks the close button on a tab
- **THEN** the tab is removed
- **AND** the next available tab becomes active

#### Scenario: Switch tabs
- **WHEN** user clicks on an inactive tab
- **THEN** that tab becomes active
- **AND** the editor displays the corresponding file content

### Requirement: Editor/Diff Toggle
The system SHALL allow users to toggle between Editor and Diff view for modified files.

#### Scenario: Toggle to diff view
- **WHEN** user clicks the Diff toggle on a modified file
- **THEN** the editor switches to side-by-side diff view
- **AND** shows original content vs current content

#### Scenario: Toggle back to editor
- **WHEN** user clicks the Editor toggle while in diff view
- **THEN** the view switches back to the editable Monaco editor

#### Scenario: Diff toggle disabled for clean files
- **WHEN** a file has no modifications (status is "clean")
- **THEN** the Diff toggle is disabled or hidden

### Requirement: File Revert
The system SHALL allow users to revert a modified file to its original content.

#### Scenario: Revert modified file
- **WHEN** user clicks the Revert button on a modified file
- **THEN** the file content is restored to its original state
- **AND** the file status changes to "clean"

#### Scenario: Revert button disabled for clean files
- **WHEN** a file has no modifications (status is "clean" or "new")
- **THEN** the Revert button is disabled or hidden

#### Scenario: Revert confirmation
- **WHEN** user clicks the Revert button
- **THEN** a confirmation dialog appears before discarding changes

