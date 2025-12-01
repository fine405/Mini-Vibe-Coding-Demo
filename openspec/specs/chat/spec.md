# chat Specification

## Purpose
TBD - created by archiving change refactor-diff-review-ux. Update Purpose after archive.
## Requirements
### Requirement: Inline Diff Preview Card

The system SHALL display an inline diff preview card within chat messages when the AI response includes code changes.

The preview card MUST show:
- Total number of files changed
- List of files with checkboxes for selection
- Per-file change statistics (lines added/removed)
- "View Diff" action per file
- "Accept Selected" and "Reject All" batch action buttons

#### Scenario: AI response with code changes shows inline preview
- **WHEN** the AI responds with a patch containing file changes
- **THEN** an inline preview card is displayed within the chat message
- **AND** each file is listed with a checkbox (checked by default)
- **AND** line change counts (+N, -M) are shown per file

#### Scenario: User accepts selected files
- **WHEN** the user clicks "Accept Selected" with some files checked
- **THEN** only the selected files are applied to the virtual file system
- **AND** a success message is shown in chat
- **AND** the preview is updated to reflect the applied state

#### Scenario: User rejects all changes
- **WHEN** the user clicks "Reject All"
- **THEN** no changes are applied
- **AND** the preview card is dismissed or marked as rejected

---

### Requirement: Diff Detail View with Bottom Toolbar

The system SHALL provide a detail view for reviewing individual file changes, displayed inline in the editor pane with a fixed bottom toolbar.

The detail view MUST include:
- Inline hunk display in the editor with Accept/Reject buttons per hunk
- Fixed bottom toolbar with file navigation and file-level actions
- Edit navigation (up/down) to jump between hunks within a file
- File navigation (prev/next) with position indicator (e.g., "1 of 4 files")

#### Scenario: User opens detail view for a file
- **WHEN** the user clicks "View Diff" on a file in the inline preview
- **THEN** the file opens in the editor pane with diff highlighting
- **AND** each hunk displays inline Accept and Reject buttons
- **AND** a bottom toolbar appears with navigation controls

#### Scenario: User navigates between files using toolbar
- **WHEN** the user clicks the < or > arrows in the bottom toolbar
- **THEN** the editor navigates to the previous or next file
- **AND** the position indicator updates (e.g., "2 of 4 files")

#### Scenario: User navigates between hunks within a file
- **WHEN** the user clicks the ↑ or ↓ arrows in the bottom toolbar
- **THEN** the editor scrolls to the previous or next hunk
- **AND** the edit count indicator shows current position (e.g., "1 edit")

#### Scenario: User accepts a single hunk inline
- **WHEN** the user clicks "Accept" button on a hunk in the editor
- **THEN** that hunk is applied immediately
- **AND** the hunk UI updates to show accepted state

#### Scenario: User rejects a single hunk inline
- **WHEN** the user clicks "Reject" button on a hunk in the editor
- **THEN** that hunk is excluded from changes
- **AND** the hunk UI updates to show rejected state

#### Scenario: Keyboard shortcuts for hunk actions
- **WHEN** the user is viewing a file with pending hunks
- **THEN** pressing `⌥⇧↩` (Option+Shift+Enter) accepts the current hunk
- **AND** pressing `⌥⇧⌫` (Option+Shift+Delete) rejects the current hunk

#### Scenario: Keyboard shortcuts for file actions
- **WHEN** the user is viewing a file in detail view
- **THEN** pressing `⌘↩` (Cmd+Enter) accepts all hunks in the file
- **AND** pressing `⌥⌘⌫` (Option+Cmd+Delete) rejects all hunks in the file

---

### Requirement: File-Level Progress Indicator

The system SHALL display a progress indicator showing the review status of all files.

#### Scenario: Progress shown during review
- **WHEN** the user is reviewing changes in the detail panel
- **THEN** a footer shows "X/Y files processed" or similar indicator
- **AND** the indicator updates as files are accepted or skipped

#### Scenario: Quick navigation from progress indicator
- **WHEN** the user clicks on a file in the progress indicator
- **THEN** the detail panel navigates to that file

---

### Requirement: Batch Operations

The system SHALL support batch operations for efficient review of multiple files.

#### Scenario: Accept all remaining hunks
- **WHEN** the user clicks "Accept All Remaining" in the detail panel
- **THEN** all pending (not yet processed) hunks are accepted
- **AND** the changes are applied to the virtual file system

#### Scenario: Skip entire file
- **WHEN** the user clicks "Skip File" in the detail panel
- **THEN** all hunks in the current file are marked as skipped
- **AND** navigation moves to the next file

#### Scenario: Complete review and apply
- **WHEN** the user clicks "Done" after reviewing
- **THEN** all accepted hunks are applied to the virtual file system
- **AND** the detail panel closes
- **AND** a success message appears in chat

