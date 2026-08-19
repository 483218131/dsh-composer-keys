# dsh-composer-keys ⌨️

[DeepSeek Harness](https://github.com/deepseek-ai/dsh)（DSH）Web 聊天输入框的键盘快捷键插件。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/dsh--plugin-v0.1.0-green.svg)
![Platform](https://img.shields.io/badge/platform-web-orange.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

纯键盘操作，无需鼠标：快速翻历史、清空输入。

---

## ✨ 功能特性

| 快捷键 | 功能 |
|--------|------|
| **↑** 方向键上 | 填入上一条历史用户消息 |
| **↓** 方向键下 | 填入下一条用户消息；翻到最新时恢复你原本输入的内容 |
| **Ctrl+C** | 无选中文本时清空输入框（避免与"复制"冲突） |

### 行为细节

- **历史循环**遵循类 shell 语义：按 ↑ 向历史回翻，按 ↓ 向新翻；翻到最新一条后再按 ↓ 会恢复你开始翻历史之前输入的内容。
- **Ctrl+C** 仅在输入框有内容且未选中任何文本时清空——若选中了文本，则优先执行浏览器原生的"复制"。
- 仅使用 **Ctrl+C** 清空，Windows 与 macOS 行为一致（macOS 下 `Cmd+C` 保留为系统"复制"）。

---

## 📦 安装

### 从 GitHub 安装

```bash
dsh plugin --profile web add https://github.com/kexin8/dsh-composer-keys.git
```

### 从本地代码安装

```bash
git clone https://github.com/kexin8/dsh-composer-keys.git
dsh plugin --profile web add link:~/dsh-composer-keys
```

### 通过 npm（发布后）

```bash
npm i dsh-composer-keys
dsh plugin --profile web add dsh-composer-keys
```

安装后重启 DSH Web GUI 并刷新页面即可生效。

---

## 🧩 工作原理

纯客户端插件。它在 `conversation.composer.dock` 插槽（输入区域的加法式、无侵入座位）注册一个不可见组件，向 `document` 挂载 `keydown` 监听器，仅在输入框聚焦时拦截快捷键：

- **↑ / ↓** —— 从实时 `ConversationSnapshot` 中读取历史用户消息，通过 `inputActions.setDraft()` 填入输入框。
- **Ctrl+C** —— 输入非空且未选中文本时，调用 `setDraft('')` 清空。

无宿主进程代码、无持久化、无设置项——纯客户端实现，插件停止/更新时干净卸载。

---

## 🗂 项目结构

```
dsh-composer-keys/
├── lib/
│   ├── index.js        # 宿主桩代码（纯客户端插件）
│   └── client.js       # 客户端模块（__ModuleLoader__ 格式）
├── cordis.patch.yml    # cordis 组合补丁（插入插件行）
├── package.json        # dsh 插件清单
└── README.md           # 文档
```

---

## 🤝 参与贡献

欢迎提交 PR！请确保改动后在 DSH Web GUI 中插件仍能正常工作。发布的 `lib/` 产物保持纯 JavaScript（不引入 TypeScript/JSX），除非功能确实需要，否则不添加宿主端逻辑。

## 📄 许可证

[MIT](./LICENSE)
