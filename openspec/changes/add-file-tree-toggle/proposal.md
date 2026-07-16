# Change: Add File Tree Panel Toggle

## Why

The file tree is always visible, so users cannot reclaim its horizontal space when they want to focus on the editor or preview.

## What Changes

- Add a file tree visibility toggle beside the existing panel controls in the application header.
- Show active and inactive states consistent with the existing Chat and Console controls.
- Animate the file tree panel when it is shown or hidden.
- Keep the file tree visible by default and preserve its in-memory state across toggles.

## Impact

- Affected specs: `layout`.
- Affected code: `src/components/Header.tsx`, `src/App.tsx`, `src/modules/layout/store.ts`, and their colocated tests.
- Dependencies: none.

## Approval Gate

Implementation starts only after this proposal and its tasks are approved.
