# Change: Refactor Preview Pane

## Why
The current PreviewPane uses Sandpack's built-in editor which conflicts with the requirement for a separate Monaco editor. The preview pane should focus solely on rendering the live preview without an embedded editor.

## What Changes
- Remove Sandpack's built-in editor from preview pane
- Configure Sandpack to show only the preview iframe
- Improve preview pane styling and header
- Add refresh button for manual preview refresh
- Ensure preview updates when virtual file system changes

## Impact
- Affected specs: preview (new capability)
- Affected code: `src/modules/preview/PreviewPane.tsx`
