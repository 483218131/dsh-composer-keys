# dsh-composer-keys ⌨️

Keyboard shortcuts for the [DeepSeek Harness](https://github.com/deepseek-ai/dsh) (DSH) Web chat composer.

**中文文档：[简体中文](./README.zh.md)**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/dsh--plugin-v0.1.0-green.svg)
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
the composer textarea is focused:

- **Arrow Up/Down** — reads historical user messages from the live
  `ConversationSnapshot` and fills the composer via `inputActions.setDraft()`.
- **Ctrl+C** — calls `setDraft('')` when the input is non-empty and nothing is selected.

No host process code, no persistence, no settings — pure client-side, stops cleanly
on plugin stop/update.

---

## 🗂 Project structure

```
dsh-composer-keys/
├── lib/
│   ├── index.js        # host stub (client-only plugin)
│   └── client.js       # client module (__ModuleLoader__ format)
├── cordis.patch.yml    # cordis composition patch (inserts the plugin row)
├── package.json        # dsh plugin manifest
└── README.md
```

---

## 🤝 Contributing

PRs are welcome! Please make sure the plugin still works in the DSH Web GUI after
your change. Keep the client code plain-JavaScript (no TypeScript/JSX in the shipped
`lib/` output) and never add host-side logic unless the feature truly needs it.

## 📄 License

[MIT](./LICENSE)
