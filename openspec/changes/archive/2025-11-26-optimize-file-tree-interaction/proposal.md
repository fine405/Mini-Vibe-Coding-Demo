# Change: Optimize File Tree Interaction

## Why
Currently, file actions like rename and delete are likely cluttered or less accessible. Moving them to a right-click context menu aligns with standard IDE patterns (like VS Code) and improves the cleanliness of the file tree UI.

## What Changes
- Remove inline/hover buttons for rename and delete in the file tree.
- Implement a context menu that appears on right-click of a file/folder item.
- The context menu should include:
  - Rename
  - Delete
  - (Optionally) other actions like Copy Path, etc., as per standard patterns, but focusing on Rename/Delete for now.
- Visual style should match the provided design (dark theme, rounded corners, specific menu item ordering).

## Impact
- Affected specs: `file-tree` capability
- Affected code: `src/modules/fs/FileTreePane.tsx`, potentially new context menu components.
