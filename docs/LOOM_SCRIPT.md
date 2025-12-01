# Loom Recording Script (~3 min)

## Overview
Quick walkthrough of Mini Lovable — a browser-based AI coding surface with chat, editor, live preview, and console.

---

## Script Outline

### 0:00 - 0:20 | Introduction
- "This is Mini Lovable, a Lovable-style AI coding surface running entirely in the browser"
- Quick pan: Chat → File Tree → Editor → Preview + Console
- "No backend needed — mocked AI for demo purposes"

### 0:20 - 1:00 | Chat-to-Code Flow
1. Type: **"create a react todo app"**
2. Show **Inline Diff Preview** in chat (expandable hunks)
3. Click **"Accept"** to apply changes
4. Watch **Preview** render the todo app instantly
5. Add a todo item to prove it works

### 1:00 - 1:40 | Iterative Development
1. Type: **"add filter buttons"**
2. Show the diff preview with code changes
3. Accept the patch
4. Demo the All/Active/Done filters in preview
5. Quick manual edit: change title text in editor
6. Show **"Modified"** badge in file tree

### 1:40 - 2:10 | File Management
1. Right-click file → show **Context Menu** (Rename/Delete)
2. Double-click to trigger inline rename
3. Open **Command Palette** (⌘K) → fuzzy search files
4. Toggle **Dark/Light theme** via header button

### 2:10 - 2:40 | Persistence & Export
1. Refresh browser → project persists (IndexedDB)
2. Click **Export → ZIP** → download bundle
3. Mention: "Can also import ZIP to restore"

### 2:40 - 3:00 | Wrap Up
- "100+ unit tests, built with React 19, Monaco, Sandpack, Zustand"
- "First-time users get an interactive tour"
- "Check the README for architecture details"
- "Thanks for watching!"

---

## Key Highlights

| Feature | Demo Point |
|---------|------------|
| Inline Diff | Expandable hunks in chat before apply |
| Live Preview | Sandpack hot-reload, instant feedback |
| Console Bridge | Logs from preview appear in console |
| Context Menu | Right-click for rename/delete |
| Command Palette | ⌘K for quick actions & file search |
| Theme Toggle | Dark/Light with system preference |
| Persistence | IndexedDB, survives refresh |
| Interactive Tour | First-visit onboarding (← → keys) |

---

## Recording Checklist

- [ ] Clean browser profile (no extensions)
- [ ] Browser zoom 100%
- [ ] Dark theme for visibility
- [ ] Clear localStorage for fresh tour dialog
- [ ] Speak at moderate pace
- [ ] Keep mouse movements smooth
