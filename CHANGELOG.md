# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-09-12

### Fixed

- **DSH 0.1.5 compatibility: the plugin was silently dead.** Arrow Up/Down stopped
  cycling history and Ctrl+C stopped clearing under DSH `0.1.5-rc.1`, with no error
  shown. The real root cause was a single change: the composer input is no longer a
  `<textarea>` but a Lexical `<div contenteditable data-composer-input>`, so the old
  `TEXTAREA`/`INPUT` guard and every `selectionStart` / `selectionEnd` / `value` read
  became no-ops (they return `undefined` and throw nothing).
- `props.useChat()` / `props.useInput()` **must be given a selector.** The official hook
  forwards it straight to `useSyncExternalStoreWithSelector`, which has no default, so a
  no-arg call throws `TypeError` and takes the entire `conversation.composer.dock` slot
  down with it (the page ends up with a `[data-slot-error]` placeholder).

### Changed

- Input element detection uses the official `[data-composer-input]` attribute first,
  falling back to `<textarea>` / `<input>` for DSH 0.1.1. No hash classes are used.
- Caret-edge detection uses `Selection` + `Range` on `contenteditable`, and keeps
  `selectionStart` / `selectionEnd` for `textarea`.
- History is read from the official `chat` hook (`ChatSnapshot.legacy.nodes`, `user` and
  `steering` nodes, full text) instead of guessing at the slot's `session` prop. The
  legacy `session` scan is kept as a fallback for DSH 0.1.1.
- Arrow keys are now observed in two phases: a `capture` listener records the caret edge
  position *before* the platform can move it, and a `bubble` listener makes the decision
  while honouring `defaultPrevented`, so the official menu keeps priority.
- The plugin no longer calls `ctx.uiSession.provide`. DSH 0.1.5's scope binding is
  globally merged and name-unique, so re-declaring the official `chat` / `input` /
  `inputActions` names throws. The component simply reads the props it already receives.

## [0.2.0] - 2026-08-28

### Changed

- Arrow Up/Down now cascade: they first move the caret like a plain text editor, and
  history cycling only starts once the caret already sits at the very start (↑) or
  end (↓) of the input (closes #1). From mid-text the browser clamps the caret to the
  edge first, Home/End style.
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
