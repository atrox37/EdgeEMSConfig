# Changelog

This document records all notable updates by version.

## Format

Each version should follow this structure:

```markdown
## [version] - YYYY-MM-DD

### Added
- Feature description

### Fixed
- Issue description

### Optimized
- Improvement description
```

## [Unreleased] - 2026-05-12

### Added
- Implemented the visual modeling module foundation, including model list management, a canvas-based editor, custom node types, edge editing, undo/redo, auto layout, fullscreen mode, and JSON/PNG import/export support.
- Added persisted visual modeling store/types and supporting dependencies for node resizing and canvas image export to prepare the new modeling workflow.
- Added instance sync API support and history service configuration API/types to extend device and storage related backend integration.

### Fixed
- Added loading states to channel, device, publish, execute, and user operation dialogs to reduce duplicate submissions during asynchronous actions.
- Corrected MQTT status wording from "Prodict SN" to "Product SN" and aligned several submit/apply flows with safer request lifecycle handling.

### Optimized
- Refactored MQTT and storage configuration pages into collapsible sections with clearer left-right layouts, sticky status panels, and improved action placement.
- Extended system configuration forms with `modsrv_url`, history service settings, and subscribe pattern interval controls for more complete service-side configuration.
- Enhanced shared UI components such as `IconButton` and `LightCollapseCard` to support loading feedback and footer actions for more consistent interaction behavior.

## [0.2.0] - 2026-04-20

### Added
- Released the first internal beta version, providing a more complete and stable closed-test experience.

### Fixed
- Systematically fixed historical issues reported in previous versions and resolved known blockers that affected daily usage.
- Addressed accumulated defects across core workflows to improve overall reliability and consistency.

### Optimized
- Refined overall interaction details and upgrade experience to make the product easier to use during internal testing.

## [0.1.15] - 2026-04-10

### Added
- Added a dedicated CAN parameter form and default channel settings to improve CAN channel setup consistency.
- Added full CAN point and mapping support across table columns, validation, and CSV import/export workflows.

### Fixed
- Fixed device point table subscription reuse and cleanup issues to prevent stale realtime updates during fast view switching.

### Optimized
- Unified request error handling and update/install progress feedback for clearer user-facing status messages.

## [0.1.13] - 2026-02-09

### Optimized
- Added initialization configuration functionality.

## [0.1.12] - 2026-02-06

### Optimized
- Updated front-end operation page styling.

## [0.1.9] - 2025-12-16

### Fixed
- Improved multi-platform packaging behavior.

---

## [0.1.8] - 2025-12-16

### Fixed
- Resolved title display issue.

---

## [0.1.7] - 2025-01-XX

### Added
- Added changelog support.
- Supported displaying update notes in automatic update prompts.

### Fixed
- Fixed incorrect version naming in package file names.
- Fixed ARM64 build path issues.

### Optimized
- Optimized build flow to extract version from git tag automatically.
- Improved error handling and debug information.

---

## [0.1.0] - 2025-01-XX

### Added
- Initial release.
- Basic PC management features.
