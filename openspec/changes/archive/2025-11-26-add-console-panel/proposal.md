# Change: Add Collapsible Console Panel

## Why
The requirements specify a collapsible Console panel that streams `console.log/error` from the preview iframe. Currently, Sandpack's built-in console is used but it needs to be separated into a dedicated, collapsible panel with proper console capture via postMessage.

## What Changes
- Create a dedicated Console panel component
- Implement console proxy script injection into preview iframe
- Use postMessage to capture console output from iframe
- Add collapsible UI with expand/collapse toggle
- Display console.log, console.warn, console.error with appropriate styling
- Add clear console functionality

## Impact
- Affected specs: console (new capability)
- Affected code: `src/modules/preview/`, new console module
