# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-08-28

### Changed

- Arrow Up/Down now cascade: in multi-line input they first move the caret like a
  plain text editor, and history cycling only starts once the caret already sits on
  the first (↑) / last (↓) line (closes #1). Single-line input is unchanged.
- Arrow keys are now ignored while an IME composition is active, so typing Chinese/
  Japanese/Korean text can no longer be replaced by a history entry.

## [0.1.1] - 2026-08-19

### Fixed

- Host plugin now exports a named `apply` function so Cordis can load it (`invalid plugin ... received object`).
- Client half also exports named `apply` / `name` instead of `export default`.

### Changed

- Clear shortcut is **Ctrl+C only** on all platforms; macOS `Cmd+C` remains the system Copy.

## [0.1.0] - 2025-08-19

### Added

- Arrow Up/Down to cycle through historical user messages in the chat composer.
- Ctrl+C to clear the composer when no text is selected (Windows and macOS identical).
- Client-only plugin registered in the `conversation.composer.dock` slot.
- `cordis.patch.yml` bundle patch for `dsh plugin` install.
