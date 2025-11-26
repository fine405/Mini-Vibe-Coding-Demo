# Change: Add Header with Layout Controls

## Why
The application currently lacks a header bar and users have no way to toggle visibility of different panels (Chat, Console). Adding VS Code-style layout toggle buttons with tooltips will improve usability and give users control over their workspace layout.

## What Changes
- Add a header bar at the top of the application
- Add layout toggle buttons on the right side of the header (similar to VS Code)
- Each button controls visibility of a panel: Chat (left), Console (bottom-right)
- Buttons have tooltips explaining their function (e.g., "Toggle Chat", "Toggle Console")
- Active/visible panels are visually indicated by button state

## Impact
- Affected specs: New `layout` capability
- Affected code:
  - `src/App.tsx` - Add header component and panel visibility state
  - New `src/components/Header.tsx` - Header with layout controls
  - `src/modules/preview/PreviewPane.tsx` - Console visibility controlled externally
  - `src/modules/chat/ChatPane.tsx` - Chat visibility controlled externally
