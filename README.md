# Mini Lovable

A minimal "Lovable-style" AI coding surface with chat, file tree, code editor, live preview, and console — all running in the browser with mocked AI responses. Perfect for demonstrating AI-assisted coding workflows without requiring API keys.

[![Mini Lovable Demo](./docs/demo.gif)](https://www.youtube.com/watch?v=LJz3hKLAldg)

> Click the gif above to watch the full demo

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

### Core Functionality
- **Chat-to-Code (Mocked AI)**: Send prompts like "create a react todo app" or "add filter buttons" to trigger predefined patches
- **Inline Diff Review**: Review AI-suggested changes with hunk-level selection before applying
- **Monaco Editor**: Full-featured code editor with syntax highlighting, multi-tab support, and built-in diff viewer
- **Live Preview**: Real-time app preview powered by Sandpack in-browser bundler with hot reload
- **Console Panel**: Streams `console.log/warn/error` from the preview iframe with color-coded output
- **File Tree**: Visual file explorer with right-click context menu, inline rename, and status badges (New/Modified)

### Persistence & Import/Export
- **IndexedDB Persistence**: Workspace auto-persists to browser storage
- **Export/Import**: Download/upload projects as JSON or ZIP bundles

### UX Polish
- **Resizable 4-Pane Layout**: Drag to resize Chat, File Tree, Editor, and Preview panels
- **Dark/Light Theme**: Toggle via header button with system preference detection
- **Command Palette (⌘K)**: Quick actions and fuzzy file search
- **Interactive Tour**: First-visit welcome dialog with guided tour of key features (use ← → keys to navigate)
- **Keyboard Shortcuts**: See [KEYBOARD_SHORTCUTS.md](./docs/KEYBOARD_SHORTCUTS.md)

## Architecture Decisions

### Tech Stack
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Vite + React 19 + TypeScript | Fast HMR, modern React features |
| Editor | `@monaco-editor/react` | VS Code-quality editing, built-in diff support |
| Preview | `@codesandbox/sandpack-react` | Battle-tested in-browser bundler |
| State | Zustand | Minimal boilerplate, excellent DevTools |
| Styling | Tailwind CSS v4 | Utility-first, fast iteration |
| Layout | `react-resizable-panels` | Smooth resizing, persistence-ready |
| UI Components | Radix UI primitives | Accessible, unstyled, composable |

### Module Structure
```
src/
├── modules/
│   ├── chat/         # Chat UI, inline diff preview, trigger → patch mapping
│   ├── editor/       # Monaco editor, tabs, diff viewer
│   ├── fs/           # Virtual file system + IndexedDB adapter
│   ├── layout/       # Panel visibility state
│   ├── patches/      # Patch loader + hunk-based apply engine
│   ├── preview/      # Sandpack wrapper + console bridge
│   ├── theme/        # Dark/light theme management
│   └── tour/         # Interactive feature tour
├── components/       # Shared UI components (dialogs, tooltips, etc.)
├── hooks/            # Custom React hooks
└── lib/              # Utilities
```

### Key Design Choices

1. **Pure Patch Engine**: The patch application logic is pure and testable, decoupled from UI. Supports `create`, `update`, and `delete` operations with hunk-level granularity.

2. **Console Bridge via postMessage**: Sandpack's preview iframe communicates console logs back to the host via a custom bridge script injected into the preview.

3. **Optimistic UI**: File changes are applied immediately with visual feedback; persistence happens asynchronously.

4. **Inline Rename with Context Menu**: File tree uses right-click context menu for rename/delete, with inline editing for rename operations. Supports keyboard shortcuts (double-click to rename, ⌘+Backspace to delete).

5. **Interactive Tour System**: First-visit onboarding with step-by-step highlights of key UI areas. Uses localStorage persistence for "don't show again" preference.

## Tradeoffs

| Decision | Benefit | Cost |
|----------|---------|------|
| Mocked AI only | Deterministic, no API keys needed | No real AI capabilities |
| Full file replacement for patches | Simpler diff logic | Larger patch payloads |
| IndexedDB for persistence | Works offline, no backend | Limited to ~50MB per origin |
| Sandpack for preview | Zero config bundling | Bundle size overhead (~500KB) |
| Monaco Editor | Feature-rich | Large bundle (~2MB) |

## Mock AI Patches

Located in `/public/patches/`:

| Trigger | File | Description |
|---------|------|-------------|
| "create a react todo app" | `todo-app.json` | Scaffolds a React + Vite todo app |
| "add filter buttons" | `add-filters.json` | Adds All/Active/Done filters |
| "add localstorage" | `add-localstorage.json` | Persists todos to localStorage |
| "refactor structure" | `refactor-structure.json` | Refactors into components |

## Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage
```

Test coverage includes:
- **Patch application** (`apply.test.ts`, `hunk.test.ts`, `loader.test.ts`)
- **Persistence** (`persistence.test.ts`, `export.test.ts`)
- **File system store** (`store.test.ts`)
- **Editor store** (`store.test.ts`)
- **Chat store** (`store.test.ts`)
- **Layout store** (`store.test.ts`)
- **Preview refresh** (`PreviewPane.test.tsx`)
- **File tree interactions** (`FileTreePane.test.tsx`)
- **Diff review toolbar** (`DiffReviewToolbar.test.tsx`)
- **Inline diff preview** (`InlineDiffPreview.test.tsx`)
- **Fuzzy matching** (`fuzzyMatch.test.ts`)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `⌘P` | Open command palette |
| `⌘S` | Save workspace |
| `⌘1` | Toggle chat panel |
| `⌘2` | Toggle console panel |
| `⌘⇧A` | Accept all changes |
| `⌘⇧R` | Revert all changes |
| `⌘Enter` | Send chat message |
| `← →` | Navigate tour steps |
| `Esc` | Skip tour / Close dialogs |

## Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm test         # Run tests
pnpm lint         # ESLint
pnpm format       # Biome formatter
```

## License

MIT