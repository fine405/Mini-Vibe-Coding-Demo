# Change: Add Keyboard Shortcuts and Command Palette Header Entry

## Why
Users need quick access to key operations via keyboard shortcuts, and the command palette (cmdk) should be discoverable from the header UI so users know it exists.

## What Changes
- Add keyboard shortcuts for key operations (toggle chat, toggle console, accept all changes)
- Register all shortcuts in the command palette for discoverability
- Add a command palette trigger button in the header with shortcut hint (⌘K)

## Impact
- Affected specs: layout
- Affected code: `src/components/Header.tsx`, `src/App.tsx`, `src/hooks/useKeyboardShortcuts.ts`
