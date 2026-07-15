## ADDED Requirements

### Requirement: Agent Draft Inline Diff

The editor SHALL display the current Agent draft as a read-only unified Monaco diff against the workspace snapshot used to start that Agent run.

#### Scenario: First Agent file mutation succeeds
- **WHEN** the first successful file mutation is projected for a run
- **THEN** the affected path opens in the editor
- **AND** the editor shows inline added and removed lines
- **AND** sufficiently large unchanged regions are collapsed

#### Scenario: Later files are modified
- **WHEN** the Agent successfully modifies additional files after the first file is displayed
- **THEN** those paths become available through draft navigation
- **AND** the editor does not steal focus from the file the user is currently reviewing

#### Scenario: Current draft file is written again
- **WHEN** the Agent successfully writes the currently displayed path again
- **THEN** the modified side refreshes to the latest successful content
- **AND** the original side remains the run snapshot content

#### Scenario: Agent creates a file
- **WHEN** a successful write targets a path absent from the run snapshot
- **THEN** the editor can open a temporary tab for that path
- **AND** the diff uses empty original content
- **AND** the path is not added to the authoritative file tree before approval

#### Scenario: Agent deletes a file
- **WHEN** a successful delete targets a snapshot file
- **THEN** the editor displays the snapshot content as removed against empty modified content
- **AND** the authoritative file remains editable outside the draft review until approval

#### Scenario: Draft file is discarded
- **WHEN** the current Agent draft file is discarded
- **THEN** an existing browser file returns to its normal editor content
- **AND** a temporary tab for an unapproved new file is closed
