# Change: Enhance File Tree Shortcuts

## Why
To further improve the efficiency of file management, users expect standard shortcuts and interactions found in other IDEs. Double-click to rename and keyboard shortcuts for deletion significantly speed up the workflow. Ensuring the input field is focused when renaming is initiated is crucial for usability.

## What Changes
- **Enter Key Rename**: Pressing `Enter` while a file is selected should trigger inline rename mode (standard IDE behavior).
- **Filename Highlight**: When entering rename mode, only the filename portion (excluding extension) should be selected/highlighted.
- **Cmd + Delete Shortcut**: Pressing `Cmd + Delete` (or `Cmd + Backspace`) while a file is selected should trigger the delete confirmation dialog.
- **Auto-Focus**: When rename mode is activated (via menu or shortcut), the input field must automatically receive focus and select the filename text.
- **Save on Blur**: When the rename input loses focus (e.g., clicking outside), the changes should be automatically saved instead of cancelled.

## Impact
- Affected specs: `file-tree` capability
- Affected code: `src/modules/fs/FileTreePane.tsx`
