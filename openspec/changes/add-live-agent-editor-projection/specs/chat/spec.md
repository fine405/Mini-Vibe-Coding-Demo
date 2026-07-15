## ADDED Requirements

### Requirement: Live Agent Draft Projection

The system SHALL project successful Agent file mutations into an ephemeral browser draft session while keeping the authoritative browser workspace unchanged until review approval.

#### Scenario: Agent successfully writes a file
- **WHEN** a `write_file` tool call reaches `output-available` with matching validated input and output
- **THEN** the latest file content is added to the current Agent draft session
- **AND** the editor can display the projected change immediately
- **AND** the browser Workspace, IndexedDB and Preview inputs remain unchanged

#### Scenario: Agent successfully deletes a file
- **WHEN** a `delete_file` tool call reaches a validated successful output
- **THEN** the draft session represents the file as deleted
- **AND** the authoritative browser file remains present until the ChangeSet is approved

#### Scenario: Tool execution is incomplete or fails
- **WHEN** a mutation tool is streaming, awaiting output or finishes with an error
- **THEN** that tool call does not change the Agent draft session

#### Scenario: Agent writes the same file repeatedly
- **WHEN** multiple successful writes target the same path during one run
- **THEN** the draft keeps only the latest successful content
- **AND** the path retains its original position in modified-file navigation

#### Scenario: Agent finalizes the run
- **WHEN** a valid `finalize_changes` output is received
- **THEN** the draft session is reconciled to the returned WorkspaceChangeSet
- **AND** the ChangeSet remains pending until the user explicitly applies a selection

### Requirement: Agent Draft Lifecycle

The system MUST clear or retain an Agent draft according to the run and review lifecycle without leaving unreviewable projected content.

#### Scenario: Run stops or fails before finalization
- **WHEN** the user stops the run, the run times out, or the stream fails without a finalized ChangeSet
- **THEN** the draft session is cleared
- **AND** the editor returns to authoritative browser content

#### Scenario: Run is regenerated
- **WHEN** the user regenerates an Agent response
- **THEN** the previous draft session is cleared
- **AND** a new session starts from a fresh browser workspace snapshot

#### Scenario: ChangeSet is applied or rejected
- **WHEN** application succeeds or the proposal is rejected
- **THEN** the draft session is cleared

#### Scenario: ChangeSet application conflicts
- **WHEN** Workspace apply returns a path or hash conflict
- **THEN** the finalized draft and its selections remain available
- **AND** the user can regenerate from the current workspace

### Requirement: Agent Draft Navigation and Discard Toolbar

The system SHALL display a bottom floating toolbar while an Agent draft has reviewable files.

#### Scenario: Draft contains modified files
- **WHEN** the first successful Agent mutation is projected
- **THEN** the toolbar displays Discard file, Discard all, Previous and Next controls
- **AND** it displays the current and total reviewable file positions

#### Scenario: User navigates between draft files
- **WHEN** the user activates Previous or Next
- **THEN** the editor opens the adjacent non-discarded file in first-mutation order
- **AND** navigation is disabled at the beginning or end of the list

#### Scenario: User discards the current file
- **WHEN** the user activates Discard file
- **THEN** the current path is excluded from the draft review surface
- **AND** later writes to that path in the same run remain discarded
- **AND** the finalized chat review initializes that file with no selected hunks

#### Scenario: User discards all during generation
- **WHEN** the user activates Discard all while the Agent is running
- **THEN** the active Agent request is stopped
- **AND** the complete draft session is cleared

### Requirement: Shared Draft and Change Review Selection

The editor draft toolbar and the finalized chat ChangeSet review SHALL use one coherent selection state for the current Agent run.

#### Scenario: File is discarded before finalization
- **WHEN** a discarded path appears in the finalized ChangeSet
- **THEN** its file and hunk controls are unselected in chat

#### Scenario: Selection changes in chat
- **WHEN** the user selects or deselects files or hunks in the finalized chat review
- **THEN** the selection used by Workspace apply is updated
- **AND** editor navigation reflects which files remain reviewable

#### Scenario: Historical ChangeSet is rendered
- **WHEN** a chat message does not belong to the current Agent draft session
- **THEN** it cannot replace or mutate the current session selection state
