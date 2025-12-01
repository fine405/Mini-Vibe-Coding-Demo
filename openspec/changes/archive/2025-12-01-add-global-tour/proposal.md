# Change: Add Global Feature Tour

## Why

New users need guidance to discover key features of Mini Lovable. A guided tour helps users understand the Chat-to-Code workflow, file management, and live preview capabilities without reading documentation.

## What Changes

- Add `TourProvider` component based on [shadcn-tour](https://github.com/niazmorshed2007/shadcn-tour) pattern
- Add tour steps highlighting: Chat pane, File tree, Editor, Preview, Console, Command palette
- Show welcome dialog on first visit with "Start Tour" / "Skip" options
- Add "Start Tour" button in Header for manual trigger
- Persist "Don't show again" preference in localStorage
- Style tour overlay and popover to match existing dark theme

## Impact

- Affected specs: New `tour` capability
- Affected code: `src/components/Header.tsx`, `src/App.tsx`, new `src/modules/tour/` module
- New dependency: None (uses existing `framer-motion`, Radix UI primitives)
