## Context

The `diff` library's `structuredPatch` function is CPU-intensive for large files. When parsing diffs for files >50KB, the main thread can be blocked for 100-500ms, causing noticeable UI jank.

## Goals / Non-Goals

**Goals:**
- Patch apply for ~100KB file in <500ms on typical laptop
- No UI jank during diff parsing
- Seamless fallback for small files (no worker overhead)

**Non-Goals:**
- Streaming diff parsing (overkill for our use case)
- SharedArrayBuffer optimization (browser support issues)

## Decisions

### Threshold for Worker Usage
- **Decision**: Use Web Worker for files >50KB or >1000 lines
- **Rationale**: Below this threshold, sync parsing is <50ms and worker overhead isn't worth it

### Worker Architecture
- **Decision**: Single reusable worker with message-based API
- **Alternatives considered**:
  - Worker pool: Overkill for sequential diff operations
  - Inline worker (blob URL): Harder to debug, same performance

### API Design
```typescript
// Sync API (existing) - for small files
parseHunks(oldContent, newContent, path, op): ParsedHunks

// Async API (new) - auto-selects based on size
parseHunksAsync(oldContent, newContent, path, op): Promise<ParsedHunks>
```

### Vite Worker Configuration
- Use `?worker` import suffix for Vite worker bundling
- Worker runs in separate thread, doesn't block UI

## Risks / Trade-offs

- **Risk**: Worker initialization overhead (~10-20ms first call)
  - **Mitigation**: Pre-initialize worker on app load
- **Risk**: Serialization overhead for large strings
  - **Mitigation**: Only use worker when parsing time > serialization time (~50KB threshold)

## Open Questions

- Should we show a progress bar for very large files (>500KB)?
- Should we cancel in-flight worker operations when modal closes?
