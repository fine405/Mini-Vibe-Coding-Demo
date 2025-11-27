# Change: Add ZIP Export/Import with Format Selection Dropdown

## Why
Current export only supports JSON format. Users need ZIP export for easier sharing and compatibility with standard project structures. The single Export/Import buttons should be replaced with dropdown menus to select format (JSON/ZIP).

## What Changes
- Add `jszip` dependency for ZIP file handling
- Add `exportProjectAsZip()` function to create ZIP archives with proper file structure
- Add `importProjectFromZip()` function to extract and load ZIP files
- Update `selectProjectFile()` to accept both `.json` and `.zip` files
- Replace Export/Import buttons in Header with dropdown menus offering JSON/ZIP options
- Add new UI components: `ExportDropdown` and `ImportDropdown`

## Impact
- Affected specs: file-tree (export/import functionality)
- Affected code:
  - `src/modules/fs/export.ts` - Add ZIP functions
  - `src/components/Header.tsx` - Replace buttons with dropdowns
  - `package.json` - Add jszip dependency
