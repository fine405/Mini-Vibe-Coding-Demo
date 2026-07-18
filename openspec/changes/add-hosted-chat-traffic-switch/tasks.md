## 0. Approval and Baseline

- [x] 0.1 Obtain explicit user approval for `proposal.md`, `design.md` and this task list before implementation.
- [x] 0.2 Record the current targeted test, typecheck, lint and build baseline.

## 1. Hosted Chat Runtime Configuration

- [x] 1.1 Define the small `HostedChatStatus` interface and pure environment parser with absent/true compatibility and fail-closed invalid values.
- [x] 1.2 Add unit tests for whitespace, case-insensitive true, false, empty/invalid values and Tavily configured status without exposing values.
- [x] 1.3 Add `CHAT_ENABLED=true` guidance to `.env.example` without changing existing Provider Key names.

## 2. Server Gate and Public Status

- [x] 2.1 Extend `ProvidersResponse` with secret-free `hostedChat.enabled` and `hostedChat.tavilyConfigured` booleans.
- [x] 2.2 Add the `/api/chat` pre-body gate and fixed `503 CHAT_DISABLED` no-store response.
- [x] 2.3 Add API tests proving enabled backward compatibility, disabled malformed/oversized body short-circuiting, no Provider/Research execution and no secret disclosure.

## 3. Chat and Settings UI

- [x] 3.1 Load hosted Chat status through the existing Provider catalog hook and include it in `canSend` decisions.
- [x] 3.2 Disable composer, suggestions, submission and Demo credential editing while deployment Chat is disabled.
- [x] 3.3 Show deterministic per-service statuses for page configuration, hosted configuration, deployment disabled and missing configuration without Key fragments.
- [x] 3.4 Add accessible UI tests for hosted DeepSeek/Tavily status, disabled traffic, BYOK blocking and existing page override behavior.

## 4. Vercel Operations Documentation

- [x] 4.1 Document Dashboard and CLI commands to add/update `CHAT_ENABLED` for Production and trigger Redeploy.
- [x] 4.2 Document verification through `/api/providers`, disabled `/api/chat`, enabled controlled Chat and platform logs.
- [x] 4.3 Document that old deployment URLs retain old environment values and that emergency shutdown may require Deployment Protection or Key revocation.

## 5. Verification and Delivery

- [x] 5.1 Run targeted tests and typecheck during each TDD slice, then run `pnpm check` after implementation and review fixes.
- [x] 5.2 Inspect the production client bundle and API canary responses for Secret or Vercel management adapter leakage.
- [x] 5.3 Review the final diff, mark tasks complete only after verified behavior, and commit the approved implementation to the current branch.
