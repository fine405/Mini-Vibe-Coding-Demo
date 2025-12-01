# Change: Refactor Diff Review UX from Modal to Inline

## Why

The current modal-based diff review interrupts the user's workflow by blocking the entire UI. Users must dismiss the modal before continuing, which breaks the conversational flow and makes it harder to compare changes with the current state.

## What Changes

- **BREAKING**: Remove the `DiffReviewModal` component and replace with inline diff review in chat
- Add inline change preview card in chat messages showing file summary
- Support one-click Accept All / Reject All from the chat message
- Support multi-select files for batch operations
- Add expandable file detail view with hunk-level accept/reject
- Add file-level navigation (prev/next) within the detail view
- Show progress indicator for processed vs pending files

## Impact

- Affected specs: `chat` (new capability)
- Affected code:
  - `src/modules/chat/ChatPane.tsx` - Add inline diff preview
  - `src/modules/chat/DiffReviewModal.tsx` - Remove or repurpose as detail view
  - `src/modules/chat/store.ts` - Track pending changes state
  - New component: `InlineDiffPreview.tsx` - Collapsible file change cards
  - New component: `DiffDetailPanel.tsx` - Full diff view with navigation
