## 1. Implementation
- [x] 1.1 Add new "Revert All Changes" command in the editor UI (button + optional menu entry) that opens a confirmation dialog summarizing affected files.
- [x] 1.2 Extend fs store with a bulk revert action that restores every modified file to its original content, deletes new files, and resets status/originalContent in a single transaction.
- [x] 1.3 Wire the new command to keyboard shortcuts (⌘⇧R) and command palette; ensure file tree + editor tabs refresh states after bulk revert.
- [x] 1.4 Add unit tests around the fs store bulk revert behavior and UX tests (or manual checklist) covering confirmation dialog + visual indicators.
- [x] 1.5 Update documentation/shortcut references describing the new capability.
- [x] 1.6 Add inline Revert button to AI chat messages after patch is applied.
