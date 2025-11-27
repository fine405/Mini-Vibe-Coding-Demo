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
The system SHALL allow users to revert modified content, either per-file or across all modified/new files in one action.

#### Scenario: Revert modified file
- **WHEN** user clicks the Revert button on a modified file
- **THEN** the file content is restored to its original state
- **AND** the file status changes to "clean"

#### Scenario: Revert button disabled for clean files
- **WHEN** a file has no modifications (status is "clean")
- **THEN** the Revert button is disabled or hidden

#### Scenario: Revert confirmation
- **WHEN** user clicks the Revert button
- **THEN** a confirmation dialog appears before discarding changes

#### Scenario: Revert all changes
- **WHEN** the user invokes the Revert All Changes action (via ⌘⇧R or command palette)
- **THEN** the system displays a confirmation dialog summarizing how many files will be affected and warning that edits will be lost
- **AND** accepting the dialog restores every modified file to its original content and deletes all new files
- **AND** file tree badges and editor tabs refresh to reflect clean state
- **AND** cancelling the dialog leaves all files unchanged

#### Scenario: Revert from chat message
- **WHEN** an AI patch has been applied and the user clicks the inline Revert button in the chat message
- **THEN** all modified files are restored to their original content and new files are deleted
- **AND** the button disappears once there are no pending changes

### Requirement: Hunk-Level Partial Apply
The system SHALL allow users to selectively apply individual hunks (chunks) within a file change, rather than accepting or rejecting the entire file.

#### Scenario: View hunks in diff review
- **WHEN** user expands a file in the DiffReviewModal
- **THEN** the system displays each hunk as a separate selectable unit
- **AND** each hunk shows its line range and diff content

#### Scenario: Select individual hunk
- **WHEN** user clicks the checkbox on a specific hunk
- **THEN** only that hunk is toggled (selected/deselected)
- **AND** the file-level checkbox reflects partial selection state (indeterminate if some hunks selected)

#### Scenario: Toggle all hunks via file checkbox
- **WHEN** user clicks the file-level checkbox
- **THEN** all hunks within that file are selected or deselected together

#### Scenario: Apply partial hunks
- **WHEN** user accepts changes with some hunks deselected
- **THEN** only the selected hunks are applied to the file
- **AND** deselected hunks are not applied (original content preserved for those sections)

#### Scenario: Single hunk file
- **WHEN** a file change contains only one hunk
- **THEN** the hunk selection behaves identically to file-level selection

### Requirement: Hunk Parsing
The system SHALL use the `diff` library to parse file changes into structured hunks for display and selection.

#### Scenario: Parse update operation
- **WHEN** a patch contains an update operation with old and new content
- **THEN** the system parses the diff into individual hunks with line ranges

#### Scenario: Create operation has single hunk
- **WHEN** a patch contains a create operation (new file)
- **THEN** the entire file content is treated as a single "add" hunk

#### Scenario: Delete operation has single hunk
- **WHEN** a patch contains a delete operation
- **THEN** the entire file is treated as a single "remove" hunk

### Requirement: Diff Performance Guardrails
The system SHALL complete patch apply operations for files up to 100KB in less than 500ms on a typical laptop, without blocking the UI thread.

#### Scenario: Large file diff parsing
- **WHEN** user opens DiffReviewModal for a file >50KB
- **THEN** the diff parsing is offloaded to a Web Worker
- **AND** the UI remains responsive during parsing
- **AND** a loading indicator is shown until parsing completes

#### Scenario: Small file diff parsing
- **WHEN** user opens DiffReviewModal for a file <50KB
- **THEN** the diff parsing uses synchronous API (no worker overhead)
- **AND** the result appears immediately

#### Scenario: Performance target met
- **WHEN** applying a patch to a 100KB file
- **THEN** the operation completes in less than 500ms
- **AND** no frame drops occur during the operation

### Requirement: Async Diff API
The system SHALL provide an async diff API that automatically selects the optimal execution strategy based on file size.

#### Scenario: Auto-select worker for large files
- **WHEN** `parseHunksAsync` is called with content >50KB
- **THEN** the operation is executed in a Web Worker

#### Scenario: Auto-select sync for small files
- **WHEN** `parseHunksAsync` is called with content <50KB
- **THEN** the operation is executed synchronously on the main thread

