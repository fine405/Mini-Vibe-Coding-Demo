## 0. Approval

- [x] 0.1 User approved the phase-one scope of `web_search` and `weather_search` on 2026-07-16.
- [x] 0.2 Use Tavily basic search with a server-only `TAVILY_API_KEY`.
- [x] 0.3 Treat phase-one Open-Meteo usage as local/controlled and non-commercial with visible attribution.

## 1. Research Domain and Tools

- [x] 1.1 Define shared bounded source, web search and weather output schemas plus a small `ResearchGateway` interface.
- [x] 1.2 Implement an abort-aware Tavily HTTP adapter with fixed basic depth, no automatic retries and sanitized errors.
- [x] 1.3 Implement Open-Meteo geocoding/forecast with current weather, at most 7 forecast days and source attribution.
- [x] 1.4 Create and register typed read-only `web_search` and `weather_search` Mastra tools through request context.
- [x] 1.5 Update Agent instructions for tool selection, citation fidelity, prompt-injection resistance, data egress and research-only completion.

## 2. Tool Trace and Citation UI

- [x] 2.1 Keep Research Tool calls in real message-part order and default `web_search` open while running and after sources arrive.
- [x] 2.2 Parse only Zod-valid completed Research Tool sources, normalize/dedupe URLs and cap citations per Assistant message.
- [x] 2.3 Render web search sources immediately in the Tool card while the final answer may still be streaming.
- [x] 2.4 Add an answer-end `N sources` trigger whose hover, focus and click states expose an accessible bounded source list.
- [x] 2.5 Preserve existing generic Tool output, reasoning and `finalize_changes` review rendering unchanged.

## 3. Testing

- [x] 3.1 Add gateway tests with mocked fetch for web/weather success, missing config/location, malformed or oversized data, 429, timeout and abort.
- [x] 3.2 Add an Agent stream integration test proving Research Tool output precedes the sourced answer and a research-only run does not finalize.
- [x] 3.3 Add pure citation tests for schema validation, URL normalization, dedupe, stable order and limits.
- [x] 3.4 Add React tests for running/completed/error traces, immediate source display, answer-end count, hover/focus access, safe links and no-source behavior.

## 4. Documentation and Verification

- [x] 4.1 Document `TAVILY_API_KEY`, Research Tool behavior, server-only secrets and Open-Meteo attribution/non-commercial restriction.
- [x] 4.2 Run the relevant tests and typecheck throughout implementation.
- [x] 4.3 Run `pnpm check`, inspect the client build for server-only research code/key names, and perform browser interaction verification.
- [x] 4.4 Review the final diff and mark every task complete only after its behavior actually passes.
