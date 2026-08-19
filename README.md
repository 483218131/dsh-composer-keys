# dsh-composer-keys

Keyboard shortcuts for the DSH chat composer.

↑ ↓ to cycle through historical user messages, Ctrl+C to clear input.

## Features

| Shortcut | Action |
|----------|--------|
| **↑ Arrow Up** | Fill the composer with the previous user message from history |
| **↓ Arrow Down** | Move to the next user message; at the end, restore the original input |
| **Ctrl+C** | Clear the composer when no text is selected |

## Install

```bash
dsh plugin add dsh-composer-keys
```

Or link a local checkout:

```bash
dsh plugin --profile web add link:~/code/dsh-composer-keys
```

## How it works

The plugin registers an invisible component in the `conversation.composer.dock` slot.
It attaches a `keydown` listener on `document` and intercepts shortcuts when the
composer textarea is focused.

- **Arrow Up/Down**: reads user messages from the `ConversationSnapshot` and
  calls `inputActions.setDraft()` to fill the composer.
- **Ctrl+C**: when no text is selected, calls `setDraft('')` to clear the input.

## License

MIT