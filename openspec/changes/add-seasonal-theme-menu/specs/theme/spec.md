## ADDED Requirements

### Requirement: Theme Keyboard Shortcuts

The system SHALL provide unmodified single-letter shortcuts `D`, `N`, `S`, `R`, `B`, and `W` for selecting Day, Night, Summer, Drizzle, Breeze, and Snow respectively.

#### Scenario: User selects a theme from a non-editable surface
- **WHEN** focus is outside an input, textarea, select, Monaco input surface, or contenteditable element
- **AND** the user presses one of `D`, `N`, `S`, `R`, `B`, or `W` without Meta, Ctrl, or Alt
- **THEN** the corresponding theme is selected
- **AND** the browser default for that matched key is prevented

#### Scenario: User types in an editable surface
- **WHEN** focus is inside an input, textarea, select, Monaco input surface, or contenteditable element
- **AND** the user presses a theme shortcut letter
- **THEN** the keystroke is left unchanged for the editable surface
- **AND** the active theme does not change

#### Scenario: User presses a modified shortcut
- **WHEN** the user presses a theme letter together with Meta, Ctrl, or Alt
- **THEN** the active theme does not change
- **AND** the existing browser or application shortcut remains available

### Requirement: Summer Leaf Shadow and Ambience Effect

The Summer theme SHALL apply the Day color scheme, display a non-interactive full-viewport looping video of moving leaf shadows using a multiply blend, and play looped forest ambience.

#### Scenario: User enters Summer
- **WHEN** the active theme changes to Summer
- **THEN** the application resolves to the light color scheme
- **AND** the leaf-shadow video plays muted and looped above the workbench
- **AND** the forest ambience plays looped and audible
- **AND** the overlay fades in without intercepting pointer input

#### Scenario: User leaves Summer
- **WHEN** the active theme changes from Summer to any other theme
- **THEN** the leaf-shadow overlay fades out
- **AND** video and forest ambience playback both pause and reset without affecting the selected theme

#### Scenario: Audible playback is blocked during restoration
- **GIVEN** Summer is restored from persisted state on page load
- **WHEN** the browser blocks audible autoplay
- **THEN** Summer and its leaf-shadow video remain active
- **AND** forest ambience retries on the next pointer or keyboard user interaction

#### Scenario: Media playback cannot start
- **WHEN** the browser rejects programmatic video or audio playback
- **THEN** the selected Summer mode and Day color scheme remain active
- **AND** the rest of the workbench remains operable

### Requirement: Placeholder Seasonal Themes

The system SHALL expose Drizzle, Breeze, and Snow as selectable and persistable theme modes while their dedicated visual effects are pending.

#### Scenario: User selects Drizzle placeholder
- **WHEN** the user selects Drizzle from the menu or presses `R` on a non-editable surface
- **THEN** Drizzle becomes the active persisted theme
- **AND** the application uses the Day color scheme without a rain effect
- **AND** the menu identifies the effect as coming later

#### Scenario: User selects Breeze placeholder
- **WHEN** the user selects Breeze from the menu or presses `B` on a non-editable surface
- **THEN** Breeze becomes the active persisted theme
- **AND** the application uses the Day color scheme without a falling-leaf effect
- **AND** the menu identifies the effect as coming later

#### Scenario: User selects Snow placeholder
- **WHEN** the user selects Snow from the menu or presses `W` on a non-editable surface
- **THEN** Snow becomes the active persisted theme
- **AND** the application uses the Day color scheme without a snow effect
- **AND** the menu identifies the effect as coming later

### Requirement: Day and Night Noise Texture

The Day and Night themes SHALL display a subtle non-interactive grayscale noise texture adapted to their respective light and dark color schemes.

#### Scenario: Night displays Lab01-style light grain
- **WHEN** Night is active
- **THEN** a fixed pre-rendered grayscale texture is tiled using a screen blend at 10% opacity
- **AND** the texture does not intercept pointer input

#### Scenario: Day displays grain on a warm white base
- **WHEN** Day is active
- **THEN** the page base is warm white `#F3F2F1`
- **AND** the same pre-rendered grayscale texture is tiled using a screen blend at 15% opacity
- **AND** the texture does not intercept pointer input

#### Scenario: Seasonal theme is active
- **WHEN** Summer, Drizzle, Breeze, or Snow is active
- **THEN** the Day/Night noise texture is hidden

## MODIFIED Requirements

### Requirement: Theme Mode Selection

The system SHALL support six explicit theme modes: `day`, `night`, `summer`, `drizzle`, `breeze`, and `snow`, and SHALL resolve each mode to either a light or dark component color scheme.

#### Scenario: User selects Day
- **WHEN** the user selects Day
- **THEN** the UI applies the existing light color scheme
- **AND** Day is persisted as the theme preference

#### Scenario: User selects Night
- **WHEN** the user selects Night
- **THEN** the UI applies the existing dark color scheme
- **AND** Night is persisted as the theme preference

#### Scenario: User selects a light seasonal theme
- **WHEN** the user selects Summer, Drizzle, Breeze, or Snow
- **THEN** the UI applies the light component color scheme
- **AND** the selected seasonal mode remains distinguishable in theme state
- **AND** the selected mode is persisted as the theme preference

### Requirement: Theme Persistence

The system SHALL persist a selected or randomly initialized explicit ThemeMode to localStorage and restore a valid mode on page load.

#### Scenario: Theme restored on page reload
- **GIVEN** the user previously selected any of the six supported themes
- **WHEN** the user reloads the page
- **THEN** the same ThemeMode and its resolved color scheme are restored

#### Scenario: First-time visitor receives a random theme
- **GIVEN** no theme preference exists in localStorage
- **WHEN** the user visits the application
- **THEN** the application randomly selects one of the six supported ThemeModes
- **AND** the selected mode and its resolved color scheme are applied and persisted

#### Scenario: Legacy explicit preference is migrated
- **GIVEN** localStorage contains the legacy mode `light` or `dark`
- **WHEN** theme state is restored
- **THEN** `light` is normalized to Day and `dark` is normalized to Night

#### Scenario: Legacy auto preference is migrated
- **GIVEN** localStorage contains the legacy mode `auto`
- **WHEN** theme state is restored
- **THEN** the preference is normalized once to Day or Night from the current system color preference
- **AND** later system preference changes do not alter the explicit ThemeMode

### Requirement: Theme Menu UI

The system SHALL provide a dedicated Theme menu in the Header, separate from the More menu, for selecting all supported themes.

#### Scenario: Theme trigger is visible
- **WHEN** the Header is displayed
- **THEN** a Theme trigger is visible between the Command Palette trigger and the More trigger
- **AND** the trigger displays the active theme icon without a text label
- **AND** its accessible name identifies the active theme

#### Scenario: Theme menu lists available modes
- **WHEN** the user opens the Theme menu
- **THEN** Day, Night, Summer, Drizzle, Breeze, and Snow are visible as separate items
- **AND** the active item is visually identified
- **AND** each item displays its single-letter shortcut in a subtle trailing style

#### Scenario: Theme remains outside More
- **WHEN** the user opens the More menu
- **THEN** no Theme item or Theme submenu is displayed there

### Requirement: Monaco Editor Theme Integration

The system SHALL synchronize Monaco editor theme with the ResolvedTheme derived from the selected ThemeMode.

#### Scenario: Editor uses dark theme for Night
- **WHEN** Night is active
- **THEN** Monaco editor uses the existing dark editor theme

#### Scenario: Editor uses light theme for a light mode
- **WHEN** Day, Summer, Drizzle, Breeze, or Snow is active
- **THEN** Monaco editor uses the existing light editor theme

#### Scenario: Resolved theme updates on switch
- **WHEN** the user switches between a dark-resolving and light-resolving ThemeMode
- **THEN** Monaco switches to the matching editor theme

## REMOVED Requirements

### Requirement: System Preference Detection

**Reason**: The current product already uses explicit light/dark selection and only retains system detection to migrate the removed legacy `auto` value. Seasonal modes require a stable explicit ThemeMode rather than ongoing system-driven changes.

**Migration**: A stored `auto` value is normalized once to Day or Night using the current system preference.

## RENAMED Requirements

- FROM: `### Requirement: Theme Toggle UI`
- TO: `### Requirement: Theme Menu UI`
