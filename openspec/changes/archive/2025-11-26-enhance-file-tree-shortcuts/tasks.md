# Tasks: Enhance File Tree Shortcuts

## 1. Enter Key Rename
- [x] 1.1 Add keyboard event listener to `TreeRow` button.
- [x] 1.2 On `Enter` key press (when file is selected and not renaming), trigger `onRename`.

## 2. Filename Highlight
- [x] 2.1 Use `useRef` to get input element reference.
- [x] 2.2 On rename mode activation, select only filename portion (exclude extension).
- [x] 2.3 Add `selection:bg-blue-500/40` class for visible highlight.

## 3. Cmd + Delete Shortcut
- [x] 3.1 Add keyboard event listener to `TreeRow` button.
- [x] 3.2 Listen for `Meta + Backspace` (Mac).
- [x] 3.3 Trigger `onDelete` when shortcut matches.

## 4. Auto-Focus Input
- [x] 4.1 Use `useEffect` to focus input when `isRenaming` becomes true.
- [x] 4.2 Select filename portion (not extension) in the input field.

## 5. Save on Blur
- [x] 5.1 Change `onBlur` handler to call `onRenameSubmit` instead of `onRenameCancel`.
