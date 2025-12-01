# Tasks: Add Global Feature Tour

## 1. Core Tour Infrastructure

- [x] 1.1 Create `src/modules/tour/Tour.tsx` with TourProvider, TourContext, and tour overlay components (adapted from shadcn-tour)
- [x] 1.2 Create `src/modules/tour/TourAlertDialog.tsx` for welcome dialog with Start/Skip options
- [x] 1.3 Create `src/modules/tour/constants.ts` with tour step IDs and localStorage keys
- [x] 1.4 Create `src/modules/tour/index.ts` barrel export

## 2. Tour Steps Configuration

- [x] 2.1 Add `id` attributes to target elements: Chat pane header, File tree header, Editor tabs, Preview header, Console header, Command palette button
- [x] 2.2 Create `src/modules/tour/steps.tsx` with tour step definitions (content, selectorId, position)

## 3. Integration

- [x] 3.1 Wrap App with TourProvider
- [x] 3.2 Add TourAlertDialog to App (shows on first visit)
- [x] 3.3 Add "Start Tour" menu item or button in Header
- [x] 3.4 Implement localStorage persistence for tour completion state

## 4. Styling

- [x] 4.1 Style tour overlay, highlight border, and popover to match dark theme
- [x] 4.2 Ensure tour works with both light and dark themes

## 5. Validation

- [x] 5.1 Manual test: First visit shows welcome dialog
- [x] 5.2 Manual test: Tour navigates through all steps correctly
- [x] 5.3 Manual test: Skip and "Don't show again" work as expected
- [x] 5.4 Manual test: Manual trigger from Header works
