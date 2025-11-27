## 1. Research & Bridging
- [x] 1.1 Audit current Sandpack integration to confirm missing `listen` + `postMessage` bridge.
- [x] 1.2 Design bridge responsibilities (message schema, host window routing, cleanup lifecycle).

## 2. Implementation
- [x] 2.1 Add Sandpack listener that forwards console events via `postMessage` (or equivalent channel) from the preview container.
- [x] 2.2 Update ConsolePanel (or a shared store) to subscribe to bridged events and render them alongside existing `useSandpackConsole` data, ensuring deduplication/reset behavior.
- [x] 2.3 Provide type-safe helpers/tests for the bridge payload (unit test or integration test covering log forwarding).

## 3. Validation
- [x] 3.1 Add/extend Vitest coverage to assert bridge dispatch + console rendering.
- [x] 3.2 Manually verify preview logs flow through the Console panel with autorun + manual refresh.
