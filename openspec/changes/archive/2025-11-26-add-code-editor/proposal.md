# Change: Add Code Editor with Tabs and Diff View

## Why
The current implementation lacks a proper code editor in the middle pane. According to requirements, users need Monaco/CodeMirror editor with tabs for open files and the ability to toggle between Editor and Diff view for modified files.

## What Changes
- Add Monaco editor component (`@monaco-editor/react`) to the middle pane
- Implement tab bar for managing multiple open files
- Add Editor/Diff toggle for modified files
- Move editor functionality from Sandpack to dedicated editor module
- Integrate with existing virtual file system store

## Impact
- Affected specs: editor (new capability)
- Affected code: `src/modules/editor/`, `src/App.tsx`, `src/modules/fs/store.tsx`
