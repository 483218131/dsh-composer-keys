# dsh-composer-keys ⌨️

Keyboard shortcuts for the [DeepSeek Harness](https://github.com/deepseek-ai/dsh) (DSH) Web chat composer.

**中文文档：[简体中文](./README.zh.md)**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/dsh--plugin-v0.2.0-green.svg)
![Platform](https://img.shields.io/badge/platform-web-orange.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

Type faster, navigate history with pure keyboard. No mouse needed.

---

## ✨ Features

| Shortcut | Action |
|----------|--------|
| **↑** Arrow Up | Fill the composer with the previous user message from history |
| **↓** Arrow Down | Move to the next user message; at the end, restore your original input |
| **Ctrl+C** | Clear the composer when no text is selected (avoids conflict with Copy) |

### Behavior details

- **History cycling** follows shell-style semantics: press ↑ to walk backwards through
  your previously sent messages; press ↓ to walk forward again; at the newest end it
  restores whatever you had typed before you started navigating.
- **Cascade cursor movement** (#1): ↑/↓ always move the caret like a plain text editor
  first; history cycling only starts once the caret already sits at the very beginning
  (↑) or very end (↓) of the input. From mid-text the browser clamps the caret to the
  edge first (Home/End style), so one extra press reaches the cycling zone.
- Arrow keys are ignored while an **IME composition** is active (e.g. typing Chinese),
  so composing text is never replaced by a history entry.
- **Ctrl+C** only clears when the composer has content and no text is selected —
  if you have selected text, the browser's native Copy takes precedence.
- Uses **Ctrl+C** only, identical on Windows and macOS (on macOS, `Cmd+C` stays the system Copy).

---

## 📦 Install

### From GitHub

```bash
dsh plugin --profile web add https://github.com/kexin8/dsh-composer-keys.git
```

### From a local checkout

```bash
git clone https://github.com/kexin8/dsh-composer-keys.git
dsh plugin --profile web add link:~/dsh-composer-keys
```

### Via npm (when published)

```bash
npm i dsh-composer-keys
dsh plugin --profile web add dsh-composer-keys
```

After installing, restart the DSH Web GUI and reload the page.

---

## 🧩 How it works

A client-only plugin. It registers an invisible component in the
`conversation.composer.dock` slot (the additive, non-destructive input-region seat),
which attaches a `keydown` listener on `document` and intercepts shortcuts only while
the composer is focused:

- **Input element detection (both DSH versions)** — matches the official
  `[data-composer-input]` attribute first (since DSH 0.1.5 the composer is a Lexical
  `contenteditable`), then falls back to `<textarea>` / `<input>` (DSH 0.1.1).
  **No hash classes are used.**
- **Arrow Up/Down** — reads historical user messages from the official `chat` hook's
  `ChatSnapshot.legacy.nodes` and fills the composer via `inputActions.setDraft()`.
  Full message text is used, not the bounded preview.
- **Caret-edge detection** — `Selection` + `Range` on `contenteditable`; `selectionStart`
  / `selectionEnd` on `textarea`.
- **How the cascade is kept honest** — a `capture` listener records the caret edge
  position as it was *before* the keypress, and a `bubble` listener makes the decision
  while respecting `defaultPrevented`. That way the official menu (e.g. the `/` command
  menu) keeps priority, and a platform that moves the caret early cannot fool the edge test.
- **Ctrl+C** — calls `setDraft('')` when the input is non-empty and nothing is selected.

> **Compatibility**: the same code runs on DSH `0.1.1-rc.2` and `0.1.5-rc.1`. Every
> version decision is a **capability probe**; no version numbers are hard-coded.
> The plugin deliberately does **not** call `ctx.uiSession.provide` — DSH 0.1.5's scope
> binding is globally merged and name-unique, so re-declaring the official `chat` /
> `input` / `inputActions` throws and takes the whole composer slot down.

No host process code, no persistence, no settings — pure client-side, stops cleanly
on plugin stop/update.

---

## 🗂 Project structure

```
dsh-composer-keys/
├── lib/
│   ├── index.js        # host stub (client-only plugin)
│   └── client.js       # client module (__ModuleLoader__ format)
├── docs/
│   └── verification-0.1.5.md   # browser assertion checklist for DSH 0.1.5
├── cordis.patch.yml    # cordis composition patch (inserts the plugin row)
├── package.json        # dsh plugin manifest
├── HANDOFF.md          # handoff index (root cause / design / pitfalls)
└── README.md
```

---

## 🤝 Contributing

PRs are welcome! Please make sure the plugin still works in the DSH Web GUI after
your change. Keep the client code plain-JavaScript (no TypeScript/JSX in the shipped
`lib/` output) and never add host-side logic unless the feature truly needs it.

## 📄 License

[MIT](./LICENSE)
