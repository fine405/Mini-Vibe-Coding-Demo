## ADDED Requirements

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
