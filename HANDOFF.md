# dsh-composer-keys · 交接索引 (HANDOFF)

更新日期：2026-09-12 | 当前阶段：**需要适配 DSH 0.1.5（插件在新宿主下已失效）**

> 本文件是新会话入口。**严禁盲目全量加载历史**：按下方「快速加载指南」取所需即可。

## 1. 快速上下文加载指南（新会话必读）

| 任务 | 必读 |
|---|---|
| **A. 适配 DSH 0.1.5（当前主任务）** | 本文件 §2（根因）、§3（双版本兼容设计）、§4（唯一缺口） |
| B. 了解插件做什么 | `README.md` / `README.zh.md` |
| C. 改代码前的约束 | `AGENTS.md` |

## 2. 现状与根因（2026-09-12 在 DSH 0.1.5-rc.1 上实测定位）

**症状**：宿主升到 0.1.5 后，输入框内 ↑/↓ 不翻历史、Ctrl+C 不清空——「按了没反应」。

**根因是双重失效**（两条都要修）：

1. **致命：槽位不再白送 props。**
   本插件客户端 `apply` 从 React `props` 取 `session` / `inputActions`，据此挂 `keydown` 监听。
   但 0.1.5 的槽位宿主改为传**空对象**：
   ```js
   renderSlot("conversation.composer.dock", {})   // dsh-client-ui-conversation/lib/client.js
   ```
   于是插件 `if (!inputActions) return;` 直接退出 → **监听器根本没挂上**。

2. **输入元素已从 `<textarea>` 换成 Lexical `contenteditable`。**
   本插件键盘守卫写死 `if (active.tagName !== "TEXTAREA" && active.tagName !== "INPUT") return;`，
   而 0.1.5 的输入框是 `<div contentEditable data-composer-input role="textbox">`（组件 `ComposerContentEditable`）。
   同时 `caretAtEdge()` 依赖 `el.selectionStart` / `el.selectionEnd` / `el.value` —— **都是 textarea/input 专有 API，contenteditable 上没有**。

**已排除的两个错误假设**（避免重查）：
- ❌「槽位 `conversation.composer.dock` 被改名/移除」→ **仍在**官方 `renderSlot` 列表中。
- ❌「`dsh.client.inject` 里声明的 `@deepseek-ai/dsh-client-runtime` 已死导致加载失败」→ 该包在 0.1.5 确实不存在，
  但**加载器不强制解析 `client.inject`**（10+ 个正常工作的第三方插件同样声明它）。**不是失效原因。**

**另一个必须记住的前提**：官方**没有**原生 ↑/↓ 历史回溯
（`dsh-client-ui-conversation` 里出现的 `ArrowUp` 是 Lexical 内部导航快捷键表，`history` 是它的撤销栈）。
→ **本插件不是多余的，值得修。**

## 3. 双版本兼容设计（0.1.1 与 0.1.5 共存）

0.1.5 把「插件从槽位白拿 props」改成了「**插件主动声明要什么**」。其绑定机制（`dsh-client-ui-session/lib/client.js` 的 `BUILTIN_SOURCE`）：

```js
{ hooks: ["session"], keyedHooks: ["projection"], props: ["sessionId"],
  resolve: (binding) => ({
    hooks:      { session: binding.session },
    keyedHooks: { projection: (key) => binding.session.projections.faceOf(key) },
    props:      { sessionId: binding.sessionId } }) }
```

即 `ctx.uiSession.provide({ hooks, keyedHooks, props, resolve })` 四件套。
conversation 包自己也用此法把 `inputActions` 发出去：
```js
ctx.uiSession.provide({ hooks: ["conversation", "input"], props: ["inputActions"], resolve })
```
→ **0.1.5 里 `inputActions` 要靠在 `props` 里声明索取。**

草稿写入侧另有官方门面 `SessionInputShell.actions`（`setDraft` / `submit` / `addAttachments` / `removeAttachment`），
它跑在**官方自持的 Lexical 编辑器**上，路径为 `ctx.conversation.input`。

**设计：三处特征探测，避免版本硬编码**

| 环节 | 0.1.1 路径 | 0.1.5 路径 |
|---|---|---|
| 拿 `inputActions` | 槽位 `props.inputActions` | `ctx.uiSession.provide({ props: ["inputActions"] })` |
| 认输入元素 | `TEXTAREA` / `INPUT` | `[data-composer-input]`（另有 `data-composer-card`、`data-input-scroll` 可用） |
| 读写草稿 / 光标 | `el.value` + `selectionStart/End` | `Selection`/`Range` 判端点 + `actions.setDraft()` 写回（或 `execCommand('insertText')`） |
| 历史来源 | `props.session` | `binding.session.projections.faceOf(key)`（keyedHooks.projection） |

判定分支建议用**能力探测**而非版本号：`if (typeof ctx.uiSession?.provide === "function") { …新路径… } else { …旧路径… }`。

## 4. 唯一还缺的一块（动手前必须先查清）

**`binding.session.projections.faceOf(key)` 里的 `key` 是什么、返回的数据形状如何、如何从中取「用户消息文本」。**

- 已知：`projection` 是 `keyedHooks`，`binding.session.projections.faceOf(key)` 是官方给投影面的取法。
- 未知：会话聊天的 projection key 名、face 的字段结构（消息角色/文本在哪一层）。
- 查法建议：在 `dsh-client-ui-conversation` / `dsh-client-ui-chat` 的 client bundle 里搜 `projections.faceOf(` 的**实际调用**与所用常量；
  或直接在浏览器控制台，从一个已挂载插件里 `ctx.get("conversation")` 探面（注意只读探测）。

**若查不通**，退路是纯 DOM 方案：从 `[data-chat-turn]` 等标记里抽用户消息。
但实测 DOM 里**没有**明确的「用户消息」role 标记（只有轮级 `data-chat-turn`），**脆弱，仅作兜底**。

## 5. 下一步行动清单 (Action Items)

- [ ] **① 查清 projection key 与数据形状**（§4）——动手前的唯一前置
- [ ] **② 实现双版本兼容**（§3 三处探测）；保持「钩子只用官方 data 属性、不碰 hash class」的既有约定
- [ ] **③ 本地验证**：本目录以 `link:` 方式挂在 profile `web` 上，改源码后**刷新浏览器即生效**（无需重装）。验证要点：
      - 长输入框内 **↑/↓ 能翻历史、Ctrl+C 能清空**
      - **中途** ↑/↓ 不劫持（应只把光标移到行首/行尾，再按才翻历史——这是既有 B 方案语义）
      - IME 输入中（`e.isComposing`）不误触发
- [ ] **④ 回归 0.1.1 路径**：确认旧宿主行为未被破坏（若已无旧宿主，至少做代码层分支自检）
- [ ] **⑤ 更新 README / CHANGELOG**，提交并推送到 `origin`（`https://github.com/483218131/dsh-composer-keys.git`）

## 6. 环境与操作要点

- 本仓库位置：`D:/Projects/dsh-composer-keys`（2026-09-12 由 `D:/dsh-composer-keys` 迁入，与同族 `dsh-composer-collapse` 对齐；旧路径已删除，勿再引用）
- profile 安装形态：`C:/Users/lidadao/.dsh/profiles/web/node_modules/dsh-composer-keys` → **符号链接**指向本目录
- **本目录在工作区之外**：文件写入需提权（`sandbox_permissions: danger-full-access`）
- 当前分支：`feat/arrow-cascade-cursor`，HEAD `c37e5cd`
- 宿主半边 `lib/index.js` 是 **no-op**，全部逻辑在客户端 `lib/client.js`

## 7. 已知坑

1. **别再相信"槽位会给 props"**——0.1.5 起必须显式声明（§3）。
2. **`el.value` / `selectionStart` 在 contenteditable 上不存在**，读了是 `undefined`，不会报错，只会静默失效。
3. **上限类效果要用"超过上限的样本"验证**——同工作区姊妹插件 `dsh-composer-collapse` 曾因此被误判为"失效"（短样本下三态看不出差别）。
4. **自建探针脚本会骗人**：本项目排障中，自写扫描脚本两次给出与 `grep` 相反的结论。凡"X 不存在"的结论，必须用独立手段复核。

## 8. 上游交叉引用

排障与结论的完整证据在迁移专项工作区：`D:/AI/测试/HANDOFF.md` §3 ⑬、
`D:/AI/测试/docs/domain/dsh-0.1.5-兼容性事实源.md` §3.3（含 0.1.5 客户端绑定机制与"槽位传空 props"的实测记录）。
