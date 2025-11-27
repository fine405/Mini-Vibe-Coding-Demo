# Design: Theme Switching

## Context

Mini-Lovable currently uses hardcoded dark theme colors. Modern AI coding tools (Claude, ChatGPT, Cursor, VS Code) all support theme switching with dark/light/auto modes. This is a cross-cutting change affecting all UI components.

## Goals / Non-Goals

**Goals:**
- Support dark, light, and auto (system preference) theme modes
- Use semantic color tokens for consistent theming
- Persist user preference across sessions
- Smooth visual transitions between themes
- Follow industry best practices for color palettes

**Non-Goals:**
- Custom theme creation/editing
- Per-component theme overrides
- Theme marketplace/sharing

## Decisions

### Color Token Strategy

Use CSS custom properties with semantic naming:
```css
--color-bg-primary: ...      /* Main background */
--color-bg-secondary: ...    /* Panel backgrounds */
--color-bg-tertiary: ...     /* Input/card backgrounds */
--color-fg-primary: ...      /* Primary text */
--color-fg-secondary: ...    /* Secondary text */
--color-fg-muted: ...        /* Muted/disabled text */
--color-border-primary: ...  /* Main borders */
--color-border-secondary: .../* Subtle borders */
--color-accent: ...          /* Primary accent (blue) */
--color-accent-hover: ...    /* Accent hover state */
--color-success: ...         /* Green for new/added */
--color-warning: ...         /* Yellow for modified */
--color-error: ...           /* Red for deleted/danger */
```

**Rationale:** Semantic tokens decouple color meaning from specific values, making theme switching straightforward.

### Theme Application Method

Apply theme via `data-theme` attribute on `<html>`:
```html
<html data-theme="dark">
```

CSS selects theme:
```css
:root[data-theme="dark"] { --color-bg-primary: #0a0a0a; }
:root[data-theme="light"] { --color-bg-primary: #ffffff; }
```

**Alternatives considered:**
- CSS classes (`.dark`, `.light`) — Less semantic, harder to query
- Separate CSS files — Increases bundle size, flash on load

### System Preference Detection

Use `matchMedia` with listener for auto mode:
```ts
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', handleChange);
```

### Color Palette Reference (Industry Best Practices)

**Dark Theme (based on Claude/Cursor):**
- Background: `#0a0a0a` to `#171717` (neutral-950 to neutral-900)
- Foreground: `#fafafa` to `#a3a3a3` (neutral-50 to neutral-400)
- Borders: `#262626` to `#404040` (neutral-800 to neutral-700)
- Accent: `#3b82f6` (blue-500)

**Light Theme (based on ChatGPT/Claude light):**
- Background: `#ffffff` to `#f5f5f5` (white to neutral-100)
- Foreground: `#171717` to `#737373` (neutral-900 to neutral-500)
- Borders: `#e5e5e5` to `#d4d4d4` (neutral-200 to neutral-300)
- Accent: `#2563eb` (blue-600)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Monaco editor theme mismatch | Use Monaco's built-in `vs-dark` and `vs` themes |
| Sandpack preview theme | Sandpack runs in iframe; keep dark theme for code preview |
| Flash of wrong theme on load | Apply theme from localStorage before React hydration |

## Migration Plan

1. Add CSS variables alongside existing hardcoded colors
2. Gradually replace hardcoded colors with variables
3. Add theme toggle UI
4. Remove hardcoded color fallbacks

## Open Questions

- Should Sandpack preview match app theme or stay dark?
- Include high-contrast theme option for accessibility?
