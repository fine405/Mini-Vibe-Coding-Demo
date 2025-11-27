## 1. Implementation

- [x] 1.1 Create `diff.worker.ts` Web Worker with `parseHunks` and `applySelectedHunks` functions
- [x] 1.2 Add worker pool manager for reusing worker instances
- [x] 1.3 Create async wrapper API (`parseHunksAsync`, `applySelectedHunksAsync`) that auto-selects sync/worker based on file size
- [x] 1.4 Update DiffReviewModal to use async API with loading skeleton for large files
- [x] 1.5 Add performance timing instrumentation (console.time in dev mode)
- [x] 1.6 Add unit tests verifying <500ms for 100KB file patch apply
- [x] 1.7 Add loading indicator in DiffReviewModal while parsing large diffs
