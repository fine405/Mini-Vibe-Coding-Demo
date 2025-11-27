## ADDED Requirements

### Requirement: ZIP Export
The system SHALL support exporting the project as a ZIP archive with proper directory structure.

#### Scenario: Export project as ZIP
- **WHEN** user selects "Export as ZIP" from the export dropdown
- **THEN** a ZIP file is downloaded containing all project files
- **AND** the ZIP preserves the directory structure (e.g., `/components/TodoInput.js`)

#### Scenario: ZIP file naming
- **WHEN** user exports as ZIP
- **THEN** the downloaded file is named `{projectName}-{timestamp}.zip`

### Requirement: ZIP Import
The system SHALL support importing projects from ZIP archives.

#### Scenario: Import project from ZIP
- **WHEN** user selects "Import ZIP" from the import dropdown
- **AND** user selects a valid ZIP file
- **THEN** the ZIP contents are extracted and loaded into the virtual file system
- **AND** the file tree displays the imported files

#### Scenario: Invalid ZIP handling
- **WHEN** user attempts to import an invalid or corrupted ZIP file
- **THEN** an error toast is displayed with a descriptive message

### Requirement: Export Format Dropdown
The system SHALL provide a dropdown menu for selecting export format instead of a single button.

#### Scenario: Export dropdown options
- **WHEN** user clicks the Export dropdown in the header
- **THEN** a menu appears with options: "Export as JSON" and "Export as ZIP"

#### Scenario: Export as JSON from dropdown
- **WHEN** user selects "Export as JSON" from the dropdown
- **THEN** the project is exported in JSON format (existing behavior)

### Requirement: Import Format Dropdown
The system SHALL provide a dropdown menu for selecting import format instead of a single button.

#### Scenario: Import dropdown options
- **WHEN** user clicks the Import dropdown in the header
- **THEN** a menu appears with options: "Import JSON" and "Import ZIP"

#### Scenario: Import JSON from dropdown
- **WHEN** user selects "Import JSON" from the dropdown
- **THEN** a file picker opens accepting `.json` files (existing behavior)

#### Scenario: Import ZIP from dropdown
- **WHEN** user selects "Import ZIP" from the dropdown
- **THEN** a file picker opens accepting `.zip` files
