# Tasks: Refactor Diff Review UX

## 1. State Management
- [x] 1.1 Extend `useChatStore` with `pendingChange` state
- [x] 1.2 Add actions for file/hunk selection updates
- [x] 1.3 Add `reviewingFileIndex` for detail panel navigation

## 2. Inline Summary Card Component
- [x] 2.1 Create `InlineDiffPreview.tsx` component
- [x] 2.2 Implement file list with checkboxes and change stats (+/- lines)
- [x] 2.3 Add "Accept Selected" and "Reject All" buttons
- [x] 2.4 Add "View Diff" button per file to open detail panel
- [x] 2.5 Integrate into `ChatPane` assistant messages with patches

## 3. Detail View with Bottom Toolbar
- [x] 3.1 Create `DiffReviewToolbar.tsx` as fixed bottom toolbar component
- [x] 3.2 Implement file navigation (< > arrows, "1 of 4 files" indicator)
- [x] 3.3 Implement edit navigation (↑↓ arrows, "N edit" indicator)
- [x] 3.4 Add "Accept File" and "Reject File" buttons with shortcuts
- [x] 3.5 Create inline hunk Accept/Reject buttons overlay in editor
- [x] 3.6 Add keyboard shortcuts:
  - `⌥⇧↩` Accept hunk, `⌥⇧⌫` Reject hunk
  - `⌘↩` Accept file, `⌥⌘⌫` Reject file

## 4. Integration
- [x] 4.1 Update `ChatPane` to show inline preview instead of opening modal
- [x] 4.2 Connect detail panel to chat store state
- [x] 4.3 Handle apply logic when user accepts changes
- [x] 4.4 Show success/revert message after applying

## 5. Cleanup
- [x] 5.1 Remove or deprecate `DiffReviewModal` component (kept for reference)
- [x] 5.2 Update any imports/references to old modal

## 6. Testing
- [x] 6.1 Add tests for inline preview rendering
- [x] 6.2 Add tests for file/hunk selection state
- [x] 6.3 Add tests for keyboard navigation in detail panel
