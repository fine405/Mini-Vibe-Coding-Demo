## ADDED Requirements

### Requirement: Versioned Workspace Snapshot

The system SHALL represent Agent-visible workspace state as a versioned snapshot with normalized paths and per-file content hashes.

#### Scenario: Snapshot is created
- **WHEN** the browser prepares a workspace for an Agent run
- **THEN** each included file has a normalized path, content and deterministic hash
- **AND** the snapshot has a base revision

#### Scenario: Unsafe or oversized content is present
- **WHEN** the workspace contains blocked paths, binary data or files beyond Agent limits
- **THEN** those files are not silently sent
- **AND** preflight returns an actionable omission or size result

### Requirement: Isolated Change Proposal

Agent file operations SHALL produce a WorkspaceChangeSet without directly mutating the authoritative browser workspace.

#### Scenario: Agent proposes create, update and delete operations
- **WHEN** the Agent finalizes its shadow workspace
- **THEN** the ChangeSet contains explicit create, update and delete operations
- **AND** update/delete operations include the expected prior file hash
- **AND** the browser workspace is unchanged until approval

### Requirement: Mandatory Change Review

The system SHALL present a finalized Agent ChangeSet through the existing file and hunk review experience before applying it.

#### Scenario: ChangeSet arrives from Agent
- **WHEN** a valid finalized ChangeSet is received
- **THEN** files and diff statistics are displayed in chat
- **AND** the user can open file-level and hunk-level detail review

#### Scenario: User rejects the proposal
- **WHEN** the user rejects all changes
- **THEN** the ChangeSet is discarded
- **AND** no workspace file is changed

#### Scenario: User accepts selected hunks
- **WHEN** the user accepts a subset of files or hunks
- **THEN** only that selection is passed to the Workspace apply interface
- **AND** all deselected content remains unchanged

### Requirement: Atomic Change Application

The Workspace module SHALL validate an entire selected ChangeSet before applying any operation.

#### Scenario: All operations are valid
- **WHEN** revision, paths and before-hashes match
- **THEN** all selected operations are applied as one transaction
- **AND** the workspace revision advances once
- **AND** an inverse transaction is retained for Undo

#### Scenario: One operation is invalid
- **WHEN** any selected operation fails validation
- **THEN** none of the selected operations are applied
- **AND** a typed error identifies the failed paths

### Requirement: Stale Change Protection

The system MUST detect edits made after the Agent snapshot and MUST NOT silently overwrite them.

#### Scenario: User edits a target file during generation
- **WHEN** the Agent ChangeSet is applied and the current file hash differs from its before-hash
- **THEN** apply returns a conflict for that file
- **AND** the complete transaction remains unapplied
- **AND** the UI offers regeneration or a new review based on current content

#### Scenario: Unrelated file changes during generation
- **WHEN** the workspace revision changes only because of files outside the ChangeSet
- **THEN** per-file hash validation determines whether the selected transaction remains safe
- **AND** safe operations may proceed according to the atomic validation policy

### Requirement: Single Workspace Mutation Interface

Chat, editor, file tree, import and Agent review modules SHALL mutate project files only through the Workspace interface.

#### Scenario: UI applies an Agent proposal
- **WHEN** the user accepts reviewed changes
- **THEN** the UI calls the Workspace apply interface
- **AND** it does not construct or persist a replacement `filesByPath` map itself

#### Scenario: Workspace implementation is refactored
- **WHEN** persistence or internal state structure changes without changing the Workspace interface
- **THEN** callers and interface-level behavior tests continue to work without knowledge of the implementation

### Requirement: Versioned Local Persistence

The system SHALL preserve existing browser workspaces while migrating persistence to a versioned, coalesced repository format.

#### Scenario: Existing workspace is loaded after upgrade
- **WHEN** IndexedDB contains the legacy file-map format
- **THEN** the data is migrated to the new workspace schema
- **AND** file contents and visible statuses are preserved

#### Scenario: User types continuously
- **WHEN** multiple file edits occur in quick succession
- **THEN** IndexedDB writes are debounced or coalesced
- **AND** the full workspace is not written once per keystroke

