## ADDED Requirements

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
