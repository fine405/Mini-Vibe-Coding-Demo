## 0. Approval and Baseline

- [x] 0.1 Obtain explicit user approval for `proposal.md`, `design.md` and this task list before implementation.
- [x] 0.2 Record the current targeted test, typecheck, lint and build baseline.

## 1. Ephemeral Credential Domain

- [x] 1.1 Define strict shared schemas/types for optional DeepSeek and Tavily demo credentials with trimming, empty-value removal and length bounds.
- [x] 1.2 Add a page-memory credential holder that exposes only public configured booleans to rendered UI and never uses browser persistence APIs.
- [x] 1.3 Add deterministic lifecycle tests proving save/replace/clear behavior and absence from localStorage, sessionStorage, IndexedDB, Cookie and project export paths.

## 2. Settings User Interface

- [x] 2.1 Add an accessible settings button to the Coding Agent header and a focused Dialog with masked DeepSeek/Tavily inputs.
- [x] 2.2 Add clear status, server-secret fallback guidance, DevTools/XSS risk warning and low-quota/revocation guidance without displaying key fragments.
- [x] 2.3 Make save affect only future runs without validation calls; make clear stop the active run before removing both in-memory values.
- [x] 2.4 Add UI tests for keyboard access, masking, save/replace/clear, configured indicators and remount/reload-equivalent cleanup.

## 3. Provider and Chat Request Integration

- [x] 3.1 Merge only DeepSeek's public configured state in the client when a page-memory DeepSeek Key exists; keep `/api/providers` secret-free and unchanged.
- [x] 3.2 Attach only non-empty demo credentials to submit and regenerate `/api/chat` bodies; never attach them to messages, URLs, headers or persisted selection state.
- [x] 3.3 Extend Chat request validation and create a request-scoped Provider config overlay that only permits DeepSeek Key override while preserving the model allowlist.
- [x] 3.4 Add Provider/client/server tests for environment fallback, ephemeral precedence, non-DeepSeek isolation, invalid/unknown fields and backward compatibility.

## 4. Tavily Request Integration

- [x] 4.1 Create the request-scoped Research gateway with the ephemeral Tavily Key when present and the server environment value otherwise.
- [x] 4.2 Preserve fake gateway injection so automated tests never contact Tavily or consume quota.
- [x] 4.3 Add tests for ephemeral precedence, environment fallback, missing configuration, cancellation and sanitized upstream authentication errors.

## 5. Security and Verification

- [x] 5.1 Add `Cache-Control: no-store` to Chat stream and Chat JSON error responses without changing the AI SDK stream contract.
- [x] 5.2 Capture API responses and structured logs with canary secrets; assert no secret, length or reversible fragment is emitted.
- [x] 5.3 Verify client code does not call Provider/Tavily endpoints directly and production code does not log request bodies or secret-bearing errors.
- [x] 5.4 Document the HTTPS, DevTools/XSS, proxy/APM body-capture, low-quota Key, revocation/rotation, authentication, rate-limit and quota requirements for online demos.
- [x] 5.5 Run targeted tests and typecheck throughout, then run `pnpm check` once at the end.
- [x] 5.6 Review the final diff, mark tasks complete only after their behavior passes, and commit the approved implementation to the current branch.
