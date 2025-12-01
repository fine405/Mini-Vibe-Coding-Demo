# Tour Capability

## ADDED Requirements

### Requirement: Tour Provider

The system SHALL provide a TourProvider component that manages tour state and renders the tour overlay.

#### Scenario: Tour provider wraps application

- **WHEN** the application loads
- **THEN** TourProvider is available as a context provider
- **AND** child components can access tour state via useTour hook

### Requirement: Tour Steps

The system SHALL display tour steps that highlight key UI elements with an overlay and popover content.

#### Scenario: Step highlights target element

- **WHEN** a tour step is active
- **THEN** the target element is highlighted with a border
- **AND** the rest of the screen is dimmed with an overlay
- **AND** a popover displays the step content near the target element

#### Scenario: Step navigation

- **WHEN** user clicks "Next" on a tour step
- **THEN** the tour advances to the next step
- **AND** the highlight moves to the new target element

#### Scenario: Step navigation backward

- **WHEN** user clicks "Previous" on a tour step (not the first step)
- **THEN** the tour returns to the previous step

#### Scenario: Tour completion

- **WHEN** user clicks "Finish" on the last step
- **THEN** the tour ends
- **AND** the completion state is persisted to localStorage

### Requirement: Welcome Dialog

The system SHALL display a welcome dialog on first visit prompting users to start or skip the tour.

#### Scenario: First visit shows welcome dialog

- **WHEN** user visits the application for the first time (no localStorage flag)
- **THEN** a welcome dialog appears with "Start Tour" and "Skip" buttons

#### Scenario: Start tour from welcome dialog

- **WHEN** user clicks "Start Tour" in the welcome dialog
- **THEN** the dialog closes
- **AND** the tour begins at step 1

#### Scenario: Skip tour from welcome dialog

- **WHEN** user clicks "Skip" in the welcome dialog
- **THEN** the dialog closes
- **AND** the tour does not start
- **AND** the preference is persisted to localStorage

#### Scenario: Returning visit does not show welcome dialog

- **WHEN** user has previously completed or skipped the tour
- **THEN** the welcome dialog does not appear on subsequent visits

### Requirement: Manual Tour Trigger

The system SHALL allow users to manually start the tour from the Header.

#### Scenario: Start tour from Header

- **WHEN** user clicks the "Start Tour" button/menu item in the Header
- **THEN** the tour begins at step 1
- **AND** the tour runs regardless of previous completion state

### Requirement: Tour Step Content

The system SHALL provide informative content for each tour step covering key features.

#### Scenario: Chat pane step

- **WHEN** the Chat pane tour step is active
- **THEN** the popover explains how to send messages to trigger AI patches

#### Scenario: File tree step

- **WHEN** the File tree tour step is active
- **THEN** the popover explains how to browse and manage files

#### Scenario: Editor step

- **WHEN** the Editor tour step is active
- **THEN** the popover explains how to view and edit code

#### Scenario: Preview step

- **WHEN** the Preview tour step is active
- **THEN** the popover explains the live preview functionality

#### Scenario: Console step

- **WHEN** the Console tour step is active
- **THEN** the popover explains how to view console logs

#### Scenario: Command palette step

- **WHEN** the Command palette tour step is active
- **THEN** the popover explains how to access commands via ⌘K

### Requirement: Theme Compatibility

The system SHALL style the tour overlay and popovers to match the current theme.

#### Scenario: Dark theme styling

- **WHEN** the application is in dark theme
- **THEN** the tour overlay, highlight, and popover use dark theme colors

#### Scenario: Light theme styling

- **WHEN** the application is in light theme
- **THEN** the tour overlay, highlight, and popover use light theme colors
