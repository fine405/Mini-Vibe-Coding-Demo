# Change: Add bulk revert for modified files

## Why
Users can currently revert files only one at a time. When multiple files are dirty, it becomes tedious to discard all edits because each file requires its own confirmation dialog. A bulk revert action is needed to quickly reset the workspace to the last accepted state.

## What Changes
- Add a global "Revert All Changes" action/shortcut that restores every modified file to its original content in one step.
- Provide an explicit confirmation flow describing how many files will be reverted and warning about data loss.
- Ensure file tree badges, editor tabs, and diff indicators refresh after the bulk revert completes.

## Impact
- Affected specs: `editor`
- Affected code: fs store (`updateFileContent`, `revertFile`, new bulk action), editor pane/tabs (new control + dialog), keyboard shortcuts/command palette (new action), possibly file tree indicators.
