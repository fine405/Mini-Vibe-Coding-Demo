# theme Specification

## Purpose
TBD - created by archiving change add-theme-switching. Update Purpose after archive.
## Requirements
### Requirement: Theme Mode Selection

The system SHALL support three theme modes: `dark`, `light`, and `auto`.

#### Scenario: User selects dark theme
- **WHEN** user selects "Dark" from theme toggle
- **THEN** the UI applies dark color scheme
- **AND** preference is persisted to localStorage

#### Scenario: User selects light theme
- **WHEN** user selects "Light" from theme toggle
- **THEN** the UI applies light color scheme
- **AND** preference is persisted to localStorage

#### Scenario: User selects auto theme
- **WHEN** user selects "Auto" from theme toggle
- **THEN** the UI applies theme matching system preference
- **AND** preference is persisted to localStorage

### Requirement: System Preference Detection

The system SHALL detect and respond to operating system color scheme preference when in `auto` mode.

#### Scenario: System preference changes while in auto mode
- **WHEN** theme mode is set to `auto`
- **AND** user changes OS from light to dark mode
- **THEN** the UI immediately switches to dark theme

#### Scenario: System preference ignored when explicit mode set
- **WHEN** theme mode is set to `dark` or `light`
- **AND** user changes OS color scheme
- **THEN** the UI remains in the explicitly selected theme

### Requirement: Theme Persistence

The system SHALL persist theme preference to localStorage and restore it on page load.

#### Scenario: Theme restored on page reload
- **GIVEN** user previously selected "Light" theme
- **WHEN** user reloads the page
- **THEN** the UI loads with light theme applied
- **AND** no flash of incorrect theme occurs

#### Scenario: First-time visitor defaults to auto
- **GIVEN** no theme preference exists in localStorage
- **WHEN** user visits the application
- **THEN** the UI applies theme based on system preference (auto mode)

### Requirement: Theme Toggle UI

The system SHALL provide a single-button theme toggle in the Header that clearly indicates the current mode and cycles between Light → Dark → Auto on each activation.

#### Scenario: Theme toggle displays current mode
- **WHEN** user views the Header
- **THEN** the toggle button shows an icon representing the active mode (Sun for light, Moon for dark, Monitor for auto)

#### Scenario: Theme toggle cycles inline
- **WHEN** user clicks the toggle button
- **THEN** the mode advances to the next value in sequence (Light → Dark → Auto → Light)
- **AND** the button updates its icon immediately without opening a dropdown

### Requirement: Semantic Color Tokens

The system SHALL use CSS custom properties with semantic naming for all theme-aware colors.

#### Scenario: Components use semantic tokens
- **WHEN** a component needs a background color
- **THEN** it references a semantic token like `--color-bg-primary`
- **AND** the token resolves to the appropriate color for current theme

#### Scenario: Theme switch updates all components
- **WHEN** user switches theme
- **THEN** all UI components update colors simultaneously
- **AND** transition is smooth (no jarring flash)

### Requirement: Monaco Editor Theme Integration

The system SHALL synchronize Monaco editor theme with the application theme.

#### Scenario: Editor uses matching theme
- **WHEN** application theme is dark
- **THEN** Monaco editor uses `vs-dark` theme

#### Scenario: Editor theme updates on switch
- **WHEN** user switches from dark to light theme
- **THEN** Monaco editor switches from `vs-dark` to `vs` theme

