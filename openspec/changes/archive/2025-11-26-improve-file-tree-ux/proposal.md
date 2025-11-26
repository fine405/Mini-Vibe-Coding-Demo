# Change: Improve File Tree UX

## Why
Browser native prompts (alert/confirm/prompt) disrupt the user experience and do not match the application's dark theme aesthetic. Inline renaming is a standard IDE pattern that provides a smoother workflow. Styled dialogs for destructive actions (like delete) ensure visual consistency and better context.

## What Changes
- **Rename**: Replace `window.prompt` with an inline input field directly in the file tree item when renaming.
  - Triggered via context menu "Rename".
  - Confirm on Enter, Cancel on Escape or blur.
  - Validate input (no empty, no duplicates).
- **Delete**: Replace `window.confirm` with a Radix UI/shadcn Dialog component.
  - Triggered via context menu "Delete".
  - Show confirmation message and file name.
  - "Delete" (destructive style) and "Cancel" buttons.

## Impact
- Affected specs: `file-tree` capability
- Affected code: `src/modules/fs/FileTreePane.tsx`, new Dialog component (`src/components/ui/dialog.tsx` or similar).
