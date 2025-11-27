## MODIFIED Requirements
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
