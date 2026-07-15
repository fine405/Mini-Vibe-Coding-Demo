## 0. Approval

- [ ] 0.1 Approve Tavily as the default web search provider and Jina Reader as the fixed webpage reader.
- [ ] 0.2 Confirm that phase 1 weather usage is local/controlled and non-commercial, or select a commercial-compatible weather provider before implementation.
- [ ] 0.3 Confirm that GitHub access is public-only and that `GITHUB_TOKEN` is optional for rate limits/public code search.
- [ ] 0.4 Do not begin implementation until this proposal, design and delta spec are explicitly approved.

## 1. Server Domain and Clients

- [ ] 1.1 Define shared `WebSource` and bounded tool output schemas with URL/title/snippet/content limits.
- [ ] 1.2 Implement abort-aware Tavily Search client with fixed basic depth, no automatic retries and sanitized errors.
- [ ] 1.3 Implement Jina Reader client plus public HTTP(S) target validation and bounded content parsing.
- [ ] 1.4 Implement Open-Meteo geocoding/forecast client with current weather, at most 7 forecast days and source attribution.
- [ ] 1.5 Implement GitHub REST search client for public repository, issue/PR and optionally authenticated public code results.
- [ ] 1.6 Add fixed-upstream allowlists, timeouts, rate-limit error mapping and output truncation shared only where behavior is identical.

## 2. Agent Tools and Instructions

- [ ] 2.1 Create typed read-only `web_search`, `read_webpage`, `get_weather` and `search_github` Mastra tools.
- [ ] 2.2 Register the tools with the existing Coding Agent without exposing arbitrary fetch, shell or write-capable network APIs.
- [ ] 2.3 Update Agent instructions for when tools are required, citation fidelity, prompt-injection resistance and external-data egress.
- [ ] 2.4 Allow research-only requests to finish with text and citations without calling `finalize_changes`; retain terminal finalization after workspace mutations.

## 3. Tool Trace and Citation UI

- [ ] 3.1 Keep Web Tool calls visible in message-part order and default their cards open while input/output is streaming.
- [ ] 3.2 Parse only Zod-valid `output.sources`, normalize/dedupe URLs and cap citations per Assistant message.
- [ ] 3.3 Add an accessible citation footer with favicon/link-icon fallback, title, hostname and safe clickable original URL.
- [ ] 3.4 Preserve existing generic Tool output and `finalize_changes` review rendering unchanged.

## 4. Testing

- [ ] 4.1 Add deterministic client/tool tests with mocked fetch for success, malformed data, missing config, 429, timeout, abort and size bounds.
- [ ] 4.2 Add security tests for unsupported schemes, URL credentials, localhost and private/reserved address targets.
- [ ] 4.3 Add Agent stream integration tests proving Web Tool input/output parts appear before the answer and research-only runs do not finalize.
- [ ] 4.4 Add React tests for running/completed/error Tool traces, citation dedupe, safe links, icon fallback and no-source answers.
- [ ] 4.5 Add opt-in smoke commands for configured Tavily/Jina/Open-Meteo/GitHub services without running them in CI.

## 5. Documentation and Verification

- [ ] 5.1 Document `TAVILY_API_KEY`, optional `JINA_API_KEY`/`GITHUB_TOKEN`, setup steps and server-only secret handling in `.env.example` and README.
- [ ] 5.2 Document current free quotas, Open-Meteo CC-BY attribution/non-commercial restriction and GitHub public-only behavior.
- [ ] 5.3 Run browser verification for weather, webpage, GitHub and general search prompts, including visible Tool input/output and clickable citations.
- [ ] 5.4 Run `pnpm check` and inspect the client bundle to confirm external-service clients and keys remain server-only.
- [ ] 5.5 Mark every task complete only after its behavior and verification actually pass.
