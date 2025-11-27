## ADDED Requirements

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
