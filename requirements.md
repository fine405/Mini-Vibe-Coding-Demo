## Goal

Create a minimal “Lovable-style” AI coding surface: chat on the left, file tree + code editor in the middle, live preview + console on the right. The “AI” is mocked: when users send certain prompts, your app returns predefined code patches and applies them to a virtual project.

## What you’ll build

1. **Start a project**
    - Click “New Project” → initialize a tiny React app in a virtual FS (no server).
    - Show file tree with badges for *new/modified* files.
2. **Chat-to-Code (mocked AI)**
    - Chat box accepts prompts.
    - For recognized prompts, fetch a local JSON “patch” (mock AI response) and show a *Diff Review* modal.
    - User can **Accept All** or **Revert** per file.
3. **Edit & Diff**
    - Middle pane has Monaco/CodeMirror with tabs.
    - Toggle between **Editor** and **Diff** for any modified file.
4. **Preview & Logs**
    - Right pane renders the app in an iframe using an in-browser bundler (e.g., **Sandpack**).
    - A collapsible **Console** panel streams `console.log/error` from the preview.
5. **Persistence & Import/Export**
    - Persist workspace to **IndexedDB** (or File System Access API if you prefer).
    - Export/import project as a `.zip` or JSON bundle.
6. **UX polish**
    - Resizable 3-pane layout, dark/light theme, command palette (⌘K) with quick actions (Open file, Search files, Accept all changes).

## Must-have scope

- React (Next.js or Vite) + TypeScript + Tailwind (or CSS).
- Editor: Monaco or CodeMirror.
- Preview: Sandpack (or similar in-browser bundler).
- Virtual file system stored locally (no backend required).
- Deterministic mock “AI patches” loaded from `/public/patches/*.json`.
- Diff viewer (side-by-side or inline).
- Basic tests (at least 3) covering: patch application, persistence, preview refresh.

## Nice-to-have

- Partial apply (accept specific hunks within a diff).
- File search with fuzzy matching.
- Keyboard shortcuts: ⌘S (save), ⌘P (open), ⌘K (palette), ⌘Enter (send chat).
- Status toasts, optimistic UI, error boundaries.
- Performance guardrails: patch apply for a ~100KB file in < 500ms on a typical laptop.

---

## Mock “AI” contract

Place JSON files under `public/patches/`. When the user sends a chat that contains a known `trigger`, load the corresponding patch and drive the UI.

**Example**: `public/patches/create-todo-react.json`

```json
{
  "id": "create-todo-react",
  "trigger": "create a react todo app",
  "summary": "Scaffold a React + Vite todo app with add/toggle/delete.",
  "changes": [
    {"op": "create", "path": "index.html", "content": "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width'></head><body><div id='root'></div><script type='module' src='/src/main.tsx'></script></body></html>"},
    {"op": "create", "path": "package.json", "content": "{\n  \"name\": \"mini-lovable-todo\",\n  \"dependencies\": {\"react\":\"^18.0.0\",\"react-dom\":\"^18.0.0\"}\n}"},
    {"op": "create", "path": "src/main.tsx", "content": "import React from 'react'; import { createRoot } from 'react-dom/client'; import App from './App'; createRoot(document.getElementById('root')!).render(<App />);"},
    {"op": "create", "path": "src/App.tsx", "content": "import React, { useState } from 'react'; export default function App(){ const [items,setItems]=useState<string[]>([]); const [text,setText]=useState(''); return (<div style={{padding:20}}><h1>Todo</h1><form onSubmit={e=>{e.preventDefault(); if(text.trim()){setItems([...items,text.trim()]); setText('');}}}><input value={text} onChange={e=>setText(e.target.value)} placeholder='Add todo'/> <button>Add</button></form><ul>{items.map((t,i)=>(<li key={i}>{t}</li>))}</ul></div>); }"}
  ]
}

```

**Example**: `public/patches/add-filters.json` (modifies existing files)

```json
{
  "id": "add-filters",
  "trigger": "add filter buttons",
  "summary": "Add All/Active/Done filters.",
  "changes": [
    {
      "op": "update",
      "path": "src/App.tsx",
      "patch": {
        "type": "replace-range",
        "startLine": 1,
        "endLine": 999,
        "content": "/* full updated file content here with filters */"
      }
    }
  ]
}

```

> Your app should support op: "create" | "update" | "delete". For update, you may accept either whole-file replacement via content or a range-replace object like above. Showing a readable diff to the user before applying is required.
> 

---

## Tech guidance

- **Framework**: Next.js (App Router) or Vite + React 18 + TS.
- **Editor**: `@monaco-editor/react` or `@uiw/react-codemirror`.
- **Preview**: `@codesandbox/sandpack-react`.
- **State**: lightweight (Zustand, Jotai, or React Query + context).
- **Persistence**: `idb-keyval` or your own IndexedDB wrapper.
- **Diff**: `diff`, `diff2html`, or Monaco’s built-in diff editor.
- **Layout**: `react-resizable-panels` (or your own).

---

## Acceptance checks

1. Click **New Project** → file tree appears; opening a file shows editor.
2. Send chat: “create a react todo app” → Diff modal shows correct changes → Accept All → preview renders the app.
3. Manually edit a file → badge shows “modified” → diff view reflects changes.
4. Send chat: “add filter buttons” → see a second patch, apply/revert.
5. Reload the page → project persists.
6. Export project → clear storage → import → preview still works.

---

## Deliverables

- GitHub repo (MIT or unlicensed), with:
    - **README**: setup, decisions, tradeoffs, known gaps, time spent.
    - **/public/patches/** with at least the two provided examples (and any others you add).
    - **Tests** (Vitest/Jest/RTL/Playwright—your choice).
    - Optional **Loom** (≤5 min) walking through the UX.

**Timebox**: Aim for 6–8 hours of focused work. If you run short, prioritize core flows; note tradeoffs in the README.

---

## Suggested repo structure

```
/src
  /modules/fs/           # virtual FS + IndexedDB adapter
  /modules/patches/      # patch loader + apply engine
  /modules/editor/       # editor components (tabs, diff)
  /modules/preview/      # Sandpack wrapper + console bridge
  /modules/chat/         # chat UI + trigger → patch mapping
  /components/           # generic UI
  /pages or /app         # routing (Next) or main (Vite)
  /styles
/public/patches

```

---

## Hints

- Keep the “AI” fully mocked—**no** external API calls.
- Build the patch engine pure & testable; the UI should just send it inputs and render results.
- For console capture, inject a small `console` proxy script into the preview iframe and postMessage back to the host.
- Use Web Workers for any heavy diffing if you notice jank.