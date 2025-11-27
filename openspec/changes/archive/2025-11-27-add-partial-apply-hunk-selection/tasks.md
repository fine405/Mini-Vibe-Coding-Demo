## 1. Implementation

- [x] 1.1 Create hunk parsing utility using `diff` library to extract structured hunks from file changes
- [x] 1.2 Add hunk selection state management in DiffReviewModal (track selected hunks per file)
- [x] 1.3 Update DiffReviewModal UI to display individual hunks with checkboxes
- [x] 1.4 Implement hunk-level toggle (select/deselect individual hunks)
- [x] 1.5 Implement file-level toggle that cascades to all hunks within the file
- [x] 1.6 Create partial apply logic that reconstructs file content from selected hunks
- [x] 1.7 Update `onAccept` callback to pass hunk selection data
- [x] 1.8 Add unit tests for hunk parsing and partial apply logic
