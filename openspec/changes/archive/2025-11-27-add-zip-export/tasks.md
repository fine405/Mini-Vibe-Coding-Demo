# Tasks: Add ZIP Export/Import

## 1. Dependencies
- [x] 1.1 Add `jszip` package to dependencies

## 2. Export Functions
- [x] 2.1 Add `exportProjectAsZip()` function in `export.ts`
- [x] 2.2 Ensure ZIP preserves directory structure (e.g., `/components/TodoInput.js`)

## 3. Import Functions
- [x] 3.1 Add `importProjectFromZip()` function in `export.ts`
- [x] 3.2 Update `selectProjectFile()` to accept `.json,.zip` file types

## 4. UI Components
- [x] 4.1 Create dropdown menu component (`dropdown-menu.tsx`)
- [x] 4.2 Update Header with Import/Export dropdowns (JSON/ZIP options)
- [x] 4.3 Update App.tsx handlers for new format options

## 5. Testing
- [x] 5.1 Add unit tests for ZIP import function (`export.test.ts`)
