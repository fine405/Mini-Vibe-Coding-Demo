# Tasks: Add Theme Switching

## 1. Theme Infrastructure

- [x] 1.1 Create `src/modules/theme/types.ts` with `ThemeMode` type (`dark` | `light` | `auto`)
- [x] 1.2 Create `src/modules/theme/store.ts` with Zustand store for theme state
- [x] 1.3 Add localStorage persistence for theme preference
- [x] 1.4 Implement system preference detection via `matchMedia('prefers-color-scheme: dark')`

## 2. CSS Custom Properties

- [x] 2.1 Define semantic color tokens in `src/index.css` (backgrounds, foregrounds, borders, accents)
- [x] 2.2 Create dark theme color values (based on current hardcoded colors)
- [x] 2.3 Create light theme color values (industry best practice from Claude/ChatGPT/Cursor)
- [x] 2.4 Apply `data-theme` attribute to document root for theme switching

## 3. Theme Toggle UI

- [x] 3.1 Create `ThemeToggle` component with dropdown (Sun/Moon/Monitor icons)
- [x] 3.2 Add theme toggle to Header component
- [x] 3.3 Add keyboard shortcut for theme cycling (optional)

## 4. Component Migration

- [x] 4.1 Update Header to use CSS variables
- [x] 4.2 Update FileTreePane to use CSS variables
- [x] 4.3 Update EditorPane/EditorTabs to use CSS variables
- [x] 4.4 Update ChatPane to use CSS variables
- [x] 4.5 Update PreviewPane/ConsolePane to use CSS variables
- [x] 4.6 Update Dialog components to use CSS variables
- [x] 4.7 Update CommandPalette to use CSS variables

## 5. Testing & Polish

- [x] 5.1 Add unit tests for theme store
- [x] 5.2 Verify Monaco editor theme integration
- [x] 5.3 Test system preference auto-switching
- [x] 5.4 Ensure smooth transitions between themes
