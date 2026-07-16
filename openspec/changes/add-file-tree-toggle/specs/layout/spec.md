## MODIFIED Requirements

### Requirement: Layout Toggle Buttons
The header SHALL contain toggle buttons on the right side to control panel visibility.

#### Scenario: Toggle buttons displayed
- **WHEN** the header is visible
- **THEN** layout toggle buttons are displayed on the right side of the header

#### Scenario: Chat panel toggle
- **WHEN** user clicks the Chat toggle button
- **THEN** the Chat panel visibility is toggled (shown/hidden)

#### Scenario: File tree panel toggle
- **WHEN** user clicks the File Tree toggle button
- **THEN** the file tree panel visibility is toggled (shown/hidden)

#### Scenario: Console panel toggle
- **WHEN** user clicks the Console toggle button
- **THEN** the Console panel visibility is toggled (shown/hidden)

### Requirement: Toggle Button Tooltips
Each layout toggle button SHALL display a tooltip on hover explaining its function.

#### Scenario: Chat toggle tooltip
- **WHEN** user hovers over the Chat toggle button
- **THEN** a tooltip displays "Toggle Chat" or similar descriptive text

#### Scenario: File tree toggle tooltip
- **WHEN** user hovers over the File Tree toggle button
- **THEN** a tooltip displays "Toggle File Tree" or similar descriptive text

#### Scenario: Console toggle tooltip
- **WHEN** user hovers over the Console toggle button
- **THEN** a tooltip displays "Toggle Console" or similar descriptive text

## ADDED Requirements

### Requirement: Animated File Tree Visibility
The application SHALL animate file tree panel visibility changes and preserve the file tree's in-memory UI state while it is hidden.

#### Scenario: Hide file tree panel
- **WHEN** the file tree is visible and the user activates its toggle
- **THEN** the panel transitions smoothly to its hidden state
- **AND** the editor and preview can use the released horizontal space

#### Scenario: Restore file tree panel
- **WHEN** the file tree is hidden and the user activates its toggle
- **THEN** the panel transitions smoothly to its visible state
- **AND** the file tree's prior search, selection, and expanded directory state are preserved
