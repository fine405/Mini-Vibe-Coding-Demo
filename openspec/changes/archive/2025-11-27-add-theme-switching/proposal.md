# Change: Add Dark/Light/Auto Theme Switching

## Why

Current UI is hardcoded to dark theme only. Users expect modern AI coding tools to support theme preferences matching their system settings or personal choice, following industry best practices from products like Claude, ChatGPT, Cursor, and VS Code.

## What Changes

- Add theme store with `dark`, `light`, `auto` modes
- Implement CSS custom properties for theming (semantic color tokens)
- Add theme toggle in Header with dropdown menu
- Persist theme preference to localStorage
- Support system preference detection via `prefers-color-scheme`
- Apply theme-aware colors to all UI components (Editor, Chat, FileTree, Preview, Console)

## Impact

- Affected specs: New `theme` capability
- Affected code:
  - `src/modules/theme/` (new module)
  - `src/components/Header.tsx` (add theme toggle)
  - `src/index.css` (CSS custom properties)
  - All component files (update hardcoded colors to use CSS variables)
