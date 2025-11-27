# Change: Add Partial Apply with Hunk-Level Selection

## Why
Currently, DiffReviewModal only supports file-level selection (accept/reject entire files). Users need finer-grained control to selectively apply individual hunks (chunks) within a file, similar to how `git add -p` works.

## What Changes
- Use the `diff` library to parse file changes into structured hunks
- Extend DiffReviewModal to display individual hunks with checkboxes
- Allow users to select/deselect specific hunks within each file
- Apply only selected hunks when accepting changes

## Impact
- Affected specs: `editor`
- Affected code:
  - `src/modules/chat/DiffReviewModal.tsx` — Add hunk-level UI and selection logic
  - `src/modules/patches/apply.ts` — Support partial hunk application
  - `src/components/DiffViewer.tsx` — May need updates for hunk-aware rendering
