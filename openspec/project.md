# Project Context

## Purpose

Mini-Lovable is a minimal "Lovable-style" AI coding surface that provides a browser-based IDE experience with:
- **Chat-to-Code**: Left pane for chat with mocked AI that applies code patches
- **File Tree + Editor**: Middle pane with file navigation and code editing
- **Live Preview + Console**: Right pane with Sandpack-powered preview and console output

The "AI" is fully mocked—recognized prompts trigger predefined JSON patches from `/public/patches/`. No external API calls are made.

## Tech Stack

### Core
- **TypeScript** ~5.9
- **React** 19 with functional components and hooks
- **Vite** (via rolldown-vite) for dev server and bundling

### UI & Styling
- **Tailwind CSS** v4 with `@tailwindcss/vite` plugin
- **Radix UI** for accessible primitives (Dialog, ScrollArea)
- **Lucide React** for icons
- **clsx** + **tailwind-merge** for conditional class composition
- **react-resizable-panels** for the 3-pane layout
- **sonner** for toast notifications
- **cmdk** for command palette

### State Management
- **Zustand** for global state (file system, patches)
- **Immer** for immutable state updates

### Editor & Preview
- **@codesandbox/sandpack-react** for in-browser bundling and preview
- **react-diff-view** + **diff** library for diff visualization

### Testing
- **Vitest** for unit tests
- **@testing-library/react** + **@testing-library/jest-dom** for component testing
- **jsdom** as test environment

### Code Quality
- **Biome** for formatting and linting (primary)
- **ESLint** with TypeScript and React plugins
- **Lefthook** for git hooks (pre-commit: biome check, pre-push: test + build)

### Package Manager
- **pnpm** with lockfile

## Project Conventions

### Code Style
- **Formatting**: Biome handles formatting; run `pnpm format` to auto-fix
- **Naming**: 
  - PascalCase for components and types
  - camelCase for functions, variables, hooks
  - kebab-case for file names (except components which use PascalCase)
- **Imports**: Absolute imports not configured; use relative paths
- **Components**: Functional components only; no class components
- **Hooks**: Custom hooks in `src/hooks/`, prefixed with `use`

### Architecture Patterns
- **Module-based structure**: Domain logic organized under `src/modules/`
  - `fs/` — Virtual file system, persistence, file tree UI
  - `patches/` — Patch loading, application, and types
  - `chat/` — Chat UI and trigger-to-patch mapping
  - `preview/` — Sandpack wrapper and console bridge
  - `editor/` — Editor components (tabs, diff)
- **Shared components**: Generic UI in `src/components/`
- **State colocation**: Zustand stores live alongside their modules (e.g., `fs/store.tsx`)
- **Pure patch engine**: Patch application logic is pure and testable; UI just sends inputs and renders results

### Testing Strategy
- **Unit tests**: Colocated with source files (e.g., `apply.test.ts` next to `apply.ts`)
- **Minimum coverage**: At least 3 tests covering patch application, persistence, and preview refresh
- **Test runner**: `pnpm test` (Vitest in watch mode), `pnpm test run` for CI
- **Pre-push hook**: Tests must pass before push

### Git Workflow
- **Hooks**: Lefthook manages pre-commit (biome check + auto-fix) and pre-push (lint, test, build)
- **Commits**: Keep commits atomic and descriptive
- **Branches**: Feature branches merged via PR

## Domain Context

### Virtual File System
- Files are stored in-memory and persisted to IndexedDB
- Each file tracks: `path`, `content`, `status` (new/modified/unchanged)
- No real filesystem access; everything runs in the browser

### Patch System
- Patches are JSON files in `/public/patches/` with structure:
  ```json
  {
    "id": "patch-id",
    "trigger": "user prompt substring",
    "summary": "Description of changes",
    "changes": [
      { "op": "create", "path": "file.tsx", "content": "..." },
      { "op": "update", "path": "file.tsx", "patch": { ... } },
      { "op": "delete", "path": "file.tsx" }
    ]
  }
  ```
- Operations: `create`, `update`, `delete`
- Updates can be whole-file replacement or range-replace

### Diff Review Flow
1. User sends chat message
2. If message contains a known trigger, load corresponding patch
3. Show Diff Review modal with changes
4. User can Accept All or Revert per file
5. Accepted changes update the virtual FS and refresh preview

## Important Constraints

- **No backend**: Everything runs client-side in the browser
- **No external AI calls**: AI is fully mocked via local JSON patches
- **Browser storage**: Persistence via IndexedDB; no server-side storage
- **Performance target**: Patch apply for ~100KB file in <500ms
- **Timebox**: Project scoped for 6-8 hours of focused work

## External Dependencies

- **Sandpack**: In-browser bundler for live preview (no external service)
- **IndexedDB**: Browser API for persistence (no external database)
- **No API keys required**: Fully self-contained
