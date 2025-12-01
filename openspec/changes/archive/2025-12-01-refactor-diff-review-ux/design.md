# Design: Inline Diff Review UX

## Context

The current diff review uses a modal overlay that blocks the entire UI. This design document outlines the new inline approach that keeps users in the chat flow while providing powerful review capabilities.

## Goals / Non-Goals

**Goals:**
- Keep users in the conversational flow
- Provide quick accept/reject for simple changes
- Support granular hunk-level review when needed
- Enable efficient batch operations on multiple files

**Non-Goals:**
- Full-featured code editor within the diff view
- Side-by-side diff comparison (keep unified diff)
- Undo/redo history beyond single revert

## Decisions

### 1. Two-Level Review Architecture

**Decision:** Implement a two-level review system:
1. **Summary Card** (inline in chat) - Quick overview with batch actions
2. **Detail Panel** (slide-out or expandable) - Full diff with hunk-level control

**Rationale:** This follows the progressive disclosure pattern used by GitHub PR reviews and VS Code's Source Control. Users can quickly accept simple changes or dive deep when needed.

### 2. Summary Card Design

```
┌─────────────────────────────────────────────────┐
│ 🤖 I can help you with that!                    │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📁 3 files changed                          │ │
│ │                                             │ │
│ │ ☑ App.tsx           +45 -12    [View Diff] │ │
│ │ ☑ styles.css        +20         [View Diff] │ │
│ │ ☑ utils.ts          +8  -3     [View Diff] │ │
│ │                                             │ │
│ │ ─────────────────────────────────────────── │ │
│ │ [✓ Accept Selected]  [✗ Reject All]        │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Features:**
- Checkbox per file for multi-select
- Line change summary (+/- counts)
- "View Diff" opens detail panel for that file
- Batch actions at bottom

### 3. Detail Panel Design

**Decision:** Use a fixed bottom toolbar (similar to VS Code's diff editor review bar) that overlays the editor area. The diff content is shown inline in the editor pane.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Editor Pane                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ proposal.md                                               │  │
│  │                                                           │  │
│  │  1  # Change: Refactor Diff Review UX                     │  │
│  │  2                                                        │  │
│  │  3  ## Why                                                │  │
│  │  4                                                        │  │
│  │  5  The current modal-based diff review...                │  │
│  │     ...                                                   │  │
│  │                                                           │  │
│  │                                    ┌─────────┐ ┌────────┐ │  │
│  │                                    │ Accept  │ │ Reject │ │  │
│  │                                    │   ⌥⇧↩   │ │  ⌥⇧⌫  │ │  │
│  │                                    └─────────┘ └────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ↑  1 edit  ↓   [Accept File ⌘↩]  [Reject File ⌥⌘⌫]   < 1 of 4 files >  │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- **Inline hunk actions**: Accept/Reject buttons float at the end of each hunk in the editor
- **Bottom toolbar** with:
  - Edit navigation: ↑↓ arrows to jump between edits within a file
  - File-level actions: "Accept File" and "Reject File" with keyboard shortcuts
  - File navigation: < > arrows with "1 of 4 files" indicator
- **Keyboard shortcuts**:
  - `⌥⇧↩` (Option+Shift+Enter): Accept current hunk
  - `⌥⇧⌫` (Option+Shift+Delete): Reject current hunk
  - `⌘↩` (Cmd+Enter): Accept entire file
  - `⌥⌘⌫` (Option+Cmd+Delete): Reject entire file
  - `←/→` or `</>` buttons: Navigate between files

### 4. State Management

**Decision:** Extend `useChatStore` with pending changes state.

```typescript
interface PendingChange {
  patch: Patch;
  fileSelections: Map<number, boolean>;  // file index -> selected
  hunkSelections: HunkSelection;         // file index -> Set<hunk index>
  status: 'pending' | 'reviewing' | 'applied' | 'rejected';
}

interface ChatStore {
  // ... existing
  pendingChange: PendingChange | null;
  setPendingChange: (change: PendingChange | null) => void;
  updateFileSelection: (fileIndex: number, selected: boolean) => void;
  updateHunkSelection: (fileIndex: number, hunkIndex: number, selected: boolean) => void;
}
```

## Alternatives Considered

### A. Keep Modal, Add Inline Preview
- **Pros:** Less code change
- **Cons:** Still interrupts flow, two separate UIs to maintain

### B. Full Inline Expansion (No Panel)
- **Pros:** Everything in chat
- **Cons:** Chat becomes cluttered, hard to navigate large diffs

### C. Editor Integration (Show Diff in Editor Pane)
- **Pros:** Familiar editing context
- **Cons:** Requires significant editor changes, loses chat context

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Chat pane too narrow for diff | Detail panel slides over or uses full width |
| Performance with large diffs | Keep async parsing, virtualize long hunks |
| Complexity increase | Reuse existing `HunkDiffView` component |

## Migration Plan

1. Build new components alongside existing modal
2. Feature flag to toggle between old/new UX
3. Remove modal after validation
4. No data migration needed (state is ephemeral)
