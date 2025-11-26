# Change: Add Editor Revert and Diff Toggle

## Why
Users need to revert individual file changes and toggle between Editor/Diff views directly in the editor pane. Currently, diff is only shown in the DiffReviewModal during patch application; there's no way to view diffs or revert changes for already-modified files.

## What Changes
- Add a visible Diff/Editor toggle button in the editor tab bar for modified files
- Add a Revert button to discard changes and restore original content for a file
- Implement EditorDiffView component using Monaco's diff editor
- Store original content in VirtualFile to enable revert

## Impact
- Affected specs: editor
- Affected code: `src/modules/editor/EditorPane.tsx`, `src/modules/editor/EditorDiffView.tsx`, `src/modules/fs/types.ts`, `src/modules/fs/store.tsx`
