## Context

The DiffReviewModal currently operates at file granularity. Users can only accept or reject entire files. For complex patches with multiple logical changes in a single file, users need the ability to cherry-pick specific hunks.

## Goals / Non-Goals

**Goals:**
- Parse diffs into structured hunks using the `diff` library (already in project dependencies)
- Allow hunk-level selection in DiffReviewModal
- Apply only selected hunks to produce the final file content

**Non-Goals:**
- Line-level selection (too granular, complex UX)
- Conflict resolution (out of scope for this change)
- Undo/redo for partial applies

## Decisions

### Hunk Parsing
- **Decision**: Use `diff.structuredPatch()` or `diff.parsePatch()` to extract hunks
- **Rationale**: The `diff` library is already a project dependency and provides structured hunk data

### Selection Model
- **Decision**: Track selection as `Map<fileIndex, Set<hunkIndex>>`
- **Rationale**: Simple, efficient lookup; supports both file-level and hunk-level operations

### Partial Apply Algorithm
1. For each selected hunk, apply it to the base content in order
2. Use line-based patching to reconstruct the final content
3. Hunks must be applied in order to maintain line number consistency

### UI Layout
- Each file section expands to show hunks
- Each hunk has its own checkbox and can be toggled independently
- File-level checkbox acts as "select all" / "deselect all" for its hunks
- Visual distinction between selected and deselected hunks (opacity, border)

## Risks / Trade-offs

- **Risk**: Hunk order dependency — skipping a hunk may shift line numbers for subsequent hunks
  - **Mitigation**: Apply hunks in reverse order (bottom-up) or recalculate offsets
- **Risk**: Complex UI for files with many hunks
  - **Mitigation**: Collapse hunks by default, show count badge

## Open Questions

- Should we support "invert hunk" (apply the opposite change)?
- Should deselected hunks be visually hidden or just dimmed?
