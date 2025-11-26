## 1. Setup
- [x] 1.1 Install `@monaco-editor/react` dependency
- [x] 1.2 Create editor module structure under `src/modules/editor/`

## 2. Core Components
- [x] 2.1 Create `EditorPane.tsx` - main editor container
- [x] 2.2 Create `EditorTabs.tsx` - tab bar for open files
- [x] 2.3 Create `MonacoEditor.tsx` - Monaco editor wrapper
- [x] 2.4 Create `EditorDiffView.tsx` - diff view using Monaco diff editor

## 3. State Management
- [x] 3.1 Add `openFiles` array to editor store for tracking open tabs
- [x] 3.2 Add `viewMode` state (editor/diff) per file
- [x] 3.3 Add actions: `openFile`, `closeFile`, `toggleViewMode`

## 4. Integration
- [x] 4.1 Update `App.tsx` to use new EditorPane in middle section
- [x] 4.2 Wire up file selection from FileTreePane to open in editor
- [x] 4.3 Sync editor changes back to virtual file system

## 5. Testing
- [x] 5.1 Add tests for tab management
- [x] 5.2 Add tests for editor/diff toggle
