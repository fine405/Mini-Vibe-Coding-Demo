# Change: Add Performance Optimization for Diff Operations

## Why
Heavy diff operations on large files (~100KB+) can cause UI jank and block the main thread. We need performance guardrails to ensure patch apply completes in <500ms and offload heavy diffing to Web Workers when needed.

## What Changes
- Add performance benchmarking for patch apply operations
- Implement Web Worker for heavy diff parsing (files >50KB or >1000 lines)
- Add async diff API that automatically uses worker for large files
- Implement progress feedback for long-running operations

## Impact
- Affected specs: `editor`
- Affected code:
  - `src/modules/patches/hunk.ts` — Add worker-based async parsing
  - `src/modules/patches/diff.worker.ts` — New Web Worker for diff operations
  - `src/modules/chat/DiffReviewModal.tsx` — Use async diff API with loading state
  - `src/modules/chat/ChatPane.tsx` — Handle async patch application
