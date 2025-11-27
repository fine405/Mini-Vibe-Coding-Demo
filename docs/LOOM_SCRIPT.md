# Loom Recording Script (≤5 min)

## Overview
Walk through the Mini Lovable UX demonstrating all core features.

---

## Script Outline

### 0:00 - 0:30 | Introduction
- "This is Mini Lovable, a browser-based AI coding surface"
- Show the 3-pane layout: Chat | File Tree + Editor | Preview + Console
- Mention: "Everything runs locally, no backend needed"

### 0:30 - 1:30 | Create a Project (Chat-to-Code)
1. Type in chat: **"create a react todo app"**
2. Show the **Diff Review Modal** appearing
3. Point out the file changes listed (index.html, package.json, src/main.tsx, src/App.tsx)
4. Click **"Accept All"**
5. Show the **Preview** rendering the todo app
6. Add a todo item to demonstrate it works

### 1:30 - 2:30 | Apply a Second Patch
1. Type in chat: **"add filter buttons"**
2. Show the diff modal with the updated App.tsx
3. Toggle between **Editor** and **Diff** view for the file
4. Click **Accept All**
5. Show the preview now has All/Active/Done filter buttons
6. Demonstrate the filters working

### 2:30 - 3:15 | Manual Editing
1. Open a file in the editor (e.g., App.tsx)
2. Make a small change (e.g., change the title)
3. Show the **"Modified"** badge appearing in the file tree
4. Show the diff view reflecting the manual change
5. Save with **⌘S** and show the toast notification

### 3:15 - 3:45 | Persistence Demo
1. Refresh the browser page
2. Show that the project persists (files still there, preview still works)
3. Mention: "Stored in IndexedDB, works offline"

### 3:45 - 4:15 | Import/Export
1. Click **Export → ZIP**
2. Show the downloaded file
3. Click **New Project** to clear everything
4. Click **Import → ZIP** and select the file
5. Show the project restored

### 4:15 - 4:45 | UX Polish
1. Open **Command Palette** with **⌘K**
2. Demonstrate fuzzy file search
3. Show quick actions (Save, Accept All, Toggle panels)
4. Toggle **Dark/Light theme**
5. Resize panels by dragging

### 4:45 - 5:00 | Wrap Up
- "All tests passing, 80 unit tests covering core functionality"
- "Built with React 19, Monaco Editor, Sandpack, Zustand"
- "Check the README for architecture decisions and tradeoffs"
- "Thanks for watching!"

---

## Key Points to Highlight

1. **Mocked AI is deterministic** - same prompts always produce same results
2. **Diff review before apply** - user has full control
3. **Real-time preview** - changes reflect immediately
4. **Console capture** - logs from preview appear in console panel
5. **Keyboard shortcuts** - power user friendly
6. **Persistence** - survives page refresh

---

## Recording Tips

- Use a clean browser profile (no extensions visible)
- Set browser zoom to 100%
- Use dark theme for better visibility
- Have the project in a clean state before recording
- Speak clearly and at a moderate pace
