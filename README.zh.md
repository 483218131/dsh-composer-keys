# dsh-composer-keys ⌨️

[DeepSeek Harness](https://github.com/deepseek-ai/dsh)（DSH）Web 聊天输入框的键盘快捷键插件。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/dsh--plugin-v0.2.1-green.svg)
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
- **级联光标移动**（#1）：↑/↓ 始终先像普通文本编辑器一样移动光标；只有当光标已位于输入框最开头（↑）或最末尾（↓）时才开始翻历史。光标在中间时，浏览器会先把它带到端点（等价 Home/End），再按一下即翻历史。
- **输入法组合期间忽略方向键**：使用中文/日文等输入法打字时，方向键不会翻历史，避免组合中的文本被历史内容覆盖。
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

- **输入元素识别（双版本）**——优先匹配官方 `[data-composer-input]`（DSH 0.1.5 起输入框是 Lexical 的 `contenteditable`），回退到 `<textarea>` / `<input>`（DSH 0.1.1）。**不依赖任何 hash class。**
- **↑ / ↓**——从官方 `chat` hook 的 `ChatSnapshot.legacy.nodes` 读取历史用户消息，通过 `inputActions.setDraft()` 填入输入框。取的是**全文**，不是会被截断的预览。
- **光标端点判定**——`contenteditable` 走 `Selection` + `Range`（判定光标前/后是否还有字符），`textarea` 走 `selectionStart/End`。
- **级联语义的实现细节**——在 `capture` 阶段记录「按键之前」的光标端点，在 `bubble` 阶段结合 `defaultPrevented` 做决策。这样既不会抢走官方菜单（如 `/` 指令菜单）的按键，也不会因为平台先移动光标而误判端点。
- **Ctrl+C**——输入非空且未选中文本时，调用 `setDraft('')` 清空。

> **兼容性**：同一份代码在 DSH `0.1.1-rc.2` 与 `0.1.5-rc.1` 下均可用，版本判定全部走**能力探测**，不硬编码版本号。
> 插件**不使用** `ctx.uiSession.provide`——0.1.5 的 scope binding 是全局合并且名称唯一的，
> 重复声明官方已有的 `chat` / `input` / `inputActions` 会抛错并炸掉整个 composer 槽。

无宿主进程代码、无持久化、无设置项——纯客户端实现，插件停止/更新时干净卸载。

---

## 🗂 项目结构

```
dsh-composer-keys/
├── lib/
│   ├── index.js        # 宿主桩代码（纯客户端插件）
│   └── client.js       # 客户端模块（__ModuleLoader__ 格式）
├── docs/
│   └── verification-0.1.5.md   # DSH 0.1.5 浏览器断言清单（可人工执行）
├── cordis.patch.yml    # cordis 组合补丁（插入插件行）
├── package.json        # dsh 插件清单
├── HANDOFF.md          # 交接索引（根因 / 设计 / 已知坑，新会话必读）
└── README.md           # 文档
```

---

## 🤝 参与贡献

欢迎提交 PR！请确保改动后在 DSH Web GUI 中插件仍能正常工作。发布的 `lib/` 产物保持纯 JavaScript（不引入 TypeScript/JSX），除非功能确实需要，否则不添加宿主端逻辑。

## 📄 许可证

[MIT](./LICENSE)
