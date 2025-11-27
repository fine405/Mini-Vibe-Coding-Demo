# Change: Update Console Bridge

## Why
The Console panel currently relies on Sandpack's built-in `useSandpackConsole` hook only. Our requirements state that console logs must be streamed via a dedicated bridge using `sandpack.listen` + `postMessage`, but no such bridge exists, so logs may miss future Sandpack events or custom metadata. We need an explicit bridge to ensure compliance with the spec and provide deterministic log streaming behavior.

## What Changes
- Introduce a console bridge that listens to Sandpack client events via `sandpack.listen` and forwards console payloads over `postMessage`.
- Update the Console panel to consume these forwarded messages, ensuring it can stream logs even if Sandpack internals change.
- Clarify the console spec to cover the `listen` + `postMessage` bridge and describe how logs are transported.
- Add validation/tests confirming the bridge forwards messages and that the Console panel renders bridged logs.

## Impact
- Affected specs: `console` (requirements around console output streaming).
- Affected code: `src/modules/preview/PreviewPane.tsx`, `ConsolePanel.tsx`, possible shared bridge utilities/tests.
