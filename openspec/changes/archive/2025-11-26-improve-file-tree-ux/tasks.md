# Tasks: Improve File Tree UX

## 1. Inline Rename
- [x] 1.1 Update `TreeRow` component to support inline editing state.
- [x] 1.2 Implement input field for renaming (auto-focus, select all text).
- [x] 1.3 Handle Enter key to confirm rename.
- [x] 1.4 Handle Escape key/Blur to cancel rename.
- [x] 1.5 Integrate with `handleRename` in `FileTreePane`.

## 2. Styled Delete Confirmation
- [x] 2.1 Create `Dialog` component (using Radix UI Dialog).
- [x] 2.2 Create `AlertDialog` or specific delete confirmation dialog using the Dialog component.
- [x] 2.3 Update `FileTreePane` to use the new Dialog for delete confirmation instead of `window.confirm`.

## 3. Testing
- [x] 3.1 Test inline rename interaction (Enter, Escape).
- [x] 3.2 Test delete confirmation dialog (Confirm, Cancel).
