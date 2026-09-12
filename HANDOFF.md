# dsh-composer-keys · 交接索引 (HANDOFF)

更新日期：2026-09-12 | 当前阶段：**0.1.5 适配已实施；A1/C1 浏览器实测通过；待补测 B/D/E，未提交**

> 本文件是新会话入口。**严禁盲目全量加载历史**：按下方「快速加载指南」取所需即可。
>
> **本轮结论一句话**：0.1.5 失效的**真实根因只有一条**——输入框从 `<textarea>` 变成 Lexical
> `contenteditable`；此前记的「槽位传空 props 导致 `inputActions` 拿不到」**已推翻**（binding 是全局合并的，
> 组件本来就有）。适配**不需要任何 `uiSession.provide`**，重复声明官方已有的 chat/input/inputActions 反而会抛错炸槽（§5 ①）。
> `lib/client.js` 已按此实施（`useChat(identitySelector)` 取 `legacy.nodes`、`[data-composer-input]` + Selection 端点判定、
> capture/bubble 双阶段保级联语义）；断言清单见 `docs/verification-0.1.5.md`。

## 1. 快速上下文加载指南（新会话必读）

| 任务 | 必读 |
|---|---|
| **A. 适配 DSH 0.1.5（当前主任务）** | 本文件 §2（根因）、§3（双版本兼容设计）、**§4（已查清，动手前置已完成）**、§5（行动清单） |
| B. 0.1.5 官方接口事实（hook/prop/projection 机制） | §10 |
| C. 了解插件做什么 | `README.md` / `README.zh.md` |
| D. 改代码前的约束 | `AGENTS.md` |
| E. 迁移怎么做的、怎么验的 | §9 |

## 2. 现状与根因（2026-09-12 在 DSH 0.1.5-rc.1 上实测定位）

**症状**：宿主升到 0.1.5 后，输入框内 ↑/↓ 不翻历史、Ctrl+C 不清空——「按了没反应」。

**根因（2026-09-12 实测修订，推翻此前的「双重失效」表述）**：

1. ~~「槽位不再白送 props，拿不到 `inputActions`」~~ —— **此判断是错的，已推翻。**
   0.1.5 的 scope binding 是**全局合并**的：`uiSession.materialize()`（`dsh-client-ui-session/lib/client.js:246-267`）
   把**所有**插件的 descriptor 合成同一个 binding，而官方 `dsh-client-ui-conversation:16593-16608`
   早已声明 `props: ["inputActions"]` / `hooks: ["conversation","input"]`，`dsh-client-ui-chat:8264-8267` 早已声明 `hooks: ["chat"]`。
   槽位渲染时 `kit = { ...standard }`（`dsh-client-ui-renderer/lib/client.js:600-601`），
   而 `renderSlot("conversation.composer.dock", {})` 传的是**空的 ownerProps**，不覆盖 kit。
   → **组件本来就能拿到 `props.inputActions` / `props.useChat`，不需要任何 `provide`**（自行 `provide` 反而会撞名抛错，见 §5 ①）。

2. **致命根因：输入元素已从 `<textarea>` 换成 Lexical `contenteditable`。**
   本插件键盘守卫写死 `if (active.tagName !== "TEXTAREA" && active.tagName !== "INPUT") return;`，
   而 0.1.5 的输入框是 `<div contentEditable data-composer-input role="textbox">`（组件 `ComposerContentEditable`）。
   同时 `caretAtEdge()` 依赖 `el.selectionStart` / `el.selectionEnd` / `el.value` —— **都是 textarea/input 专有 API，contenteditable 上没有**（读了是 `undefined`，不报错、只静默失效）。

3. **适配期新发现的第三个坑：官方 hook 的 selector 形参没有默认值。**
   `useChat()` / `useInput()` 无参调用会抛 `TypeError`，把整个 composer 槽炸成 `data-slot-error`。
   详见 §7 坑 7 与 §10 ②。

**已排除的两个错误假设**（避免重查）：
- ❌「槽位 `conversation.composer.dock` 被改名/移除」→ **仍在**官方 `renderSlot` 列表中，且声明为 `{ kind: "list", scope: "session" }`。
- ❌「`dsh.client.inject` 里声明的 `@deepseek-ai/dsh-client-runtime` 已死导致加载失败」→ 该包在 0.1.5 确实不存在，
  但**加载器不强制解析 `client.inject`**（10+ 个正常工作的第三方插件同样声明它）。**不是失效原因。**

**另一个必须记住的前提**：官方**没有**原生 ↑/↓ 历史回溯
（`dsh-client-ui-conversation` 里出现的 `ArrowUp` 是 Lexical 内部导航快捷键表，`history` 是它的撤销栈）。
→ **本插件不是多余的，值得修。**

## 3. 双版本兼容设计（0.1.1 与 0.1.5 共存）

> ⚠️ **本节旧表述「插件主动声明要什么」已作废。** 0.1.5 的 scope binding 是**全局合并**的：
> 官方包已经声明过的名字，插件**再声明就是重名错误**。插件能做的只是「**读取**组件已收到的 props」。
> 下表与判定分支已按实测更正。

其绑定机制（`dsh-client-ui-session/lib/client.js` 的 `BUILTIN_SOURCE`）：

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
→ 这些名字一旦官方声明过，**`materialize()` 就把它们并进同一个 binding，组件自动拿到**；
本插件**不需要、也不允许**再声明一遍（重名即抛错，见 §5 ①）。

草稿写入侧另有官方门面 `SessionInputShell.actions`（`setDraft` / `submit` / `addAttachments` / `removeAttachment`），
它跑在**官方自持的 Lexical 编辑器**上，路径为 `ctx.conversation.input`。

**设计：三处特征探测，避免版本硬编码**

| 环节 | 0.1.1 路径 | 0.1.5 路径 |
|---|---|---|
| 拿 `inputActions` | 槽位 `props.inputActions` | **同一个 `props.inputActions`**（官方 ui-conversation 已全局声明，组件自动收到；**不要自己 provide**） |
| 认输入元素 | `TEXTAREA` / `INPUT` | `[data-composer-input]`（另有 `data-composer-card`、`data-input-scroll` 可用） |
| 读写草稿 / 光标 | `el.value` + `selectionStart/End` | `Selection`/`Range` 判端点 + `actions.setDraft()` 写回 |
| 历史来源 | `props.session` | **不是 projection**，是 `hooks: ["chat"]` → `useChat(selector)` → `ChatSnapshot.legacy.nodes`（见 §4） |

判定分支用**能力探测**而非版本号（例如 `typeof props.useChat === "function"` 决定走新路径，
`typeof el.matches === "function" && el.matches("[data-composer-input]")` 决定用 Selection 还是 textarea API）。

## 4. 唯一缺口的查清结果（2026-09-12 完成，动手前置已满足）

> 原表述：「`binding.session.projections.faceOf(key)` 里的 `key` 是什么、返回的数据形状如何、如何取用户消息文本。」
>
> **结论：这条路线不成立，key 不存在。** 正确的数据来源是官方 `chat` hook。

### 4.1 为什么 `faceOf(key)` 这条路走不通

| 事实 | 证据 |
|---|---|
| `faceOf(key)` 返回的是**可观察快照**，不是数据本身 | `dsh-api-session-controller/lib/types/client/contract/session.d.ts:55` `faceOf(key: string): ObservableSnapshot<unknown>` |
| 取值要 `.getSnapshot()`，做一次可读快照 | `dsh-client-ui-goal/lib/client.js:535` `...faceOf("goal")?.getSnapshot()` |
| 插件只能拿到 `props.projection` 这个**函数**，它返回 `ObservableSnapshot`（无 `.get`） | `dsh-client-ui-session` BUILTIN_SOURCE 的 `keyedHooks.projection` |
| **全仓没有任何一处注册 `"chat"` / `"messages"` projection key** | 逐包扫描 `projections.register(` / projection 定义，命中仅 `dsh-agent-loop/lib/index.js:78` 的 `inboxProjectionDefinition`（会话收件箱，不是聊天历史） |
| `ProjectionValueStore.get(key)`（同步取值）**只存在于 client 侧 store**，不跨插件边界暴露 | `dsh-api-session-controller/lib/types/client/sessions/projection-store.d.ts:69`；`ctx.session.projections` 的公开面只有 `faceOf` |

### 4.2 正确来源：官方 `chat` hook + `ChatSnapshot`

`dsh-client-ui-chat` 自己就声明了（`dsh-client-ui-chat/lib/client.js:8264`）：

```js
ctx.uiSession.provide({ hooks: ["chat"], resolve: (binding) => ({ hooks: { chat: chatSource(binding) } }) });
```

其值为 `ChatSnapshot`（`dsh-client-ui-chat/lib/types/client/contract/snapshot.d.ts:77`）：

```ts
interface ChatSnapshot {
  readonly order: readonly string[];
  readonly nodes: ChatNodeStore;              // .values() → ChatConversationViewNode[]
  readonly locations: ChatLocationNodeIndex;
  readonly navigation: ChatTurnNavigationIndex;  // .items() → { turn, anchorKey, prompt, response }
  readonly timeline: ConversationTimelineSnapshot;
  readonly legacy: LegacyConversationSlice;   // ← 用户消息在这里
}
```

**用户消息取法（推荐）**：`chat.legacy.nodes` 过滤 `kind`，再拼 `content`。

```ts
// dsh-client-ui-conversation/lib/types/client/contract/records.d.ts
interface UserMessageNode    { kind: 'user';     seq: number; time: number; content: readonly ContentBlock[]; source: unknown }
interface SteeringMessageNode{ kind: 'steering'; messageId: MessageId; seq: number; time: number; content: readonly ContentBlock[] }
// ContentBlock（dsh-llm/lib/types/types.d.ts:39+）: {type:'text',text} | {type:'reasoning',text}
//   | {type:'image',attachment} | {type:'file',attachment} | {type:'tool-call',...} | {type:'tool-result',...}
```

**备选**：`chat.navigation.items()` 的 `prompt` 字段每轮一个**有界预览**——实现更短，但被截断，不适合「翻历史填入草稿」。
**兜底**：§4 原提法的纯 DOM 方案（`[data-chat-turn]`）**仍然没有**用户消息 role 标记，脆弱，只在上面两条都不可用时用。

### 4.3 ~~声明写法~~（**本节作废，2026-09-12 实测推翻**）

> ❌ **不要照抄下面的代码。** 它会让插件抛异常：`chat` / `input` / `inputActions` **三个名字官方都已声明**，
> 而 scope binding 全局合并且名称唯一，重名即 `uiSession.provide: duplicate …`。
> **正确做法：一条 `provide` 都不写**，直接用组件已收到的 props。见 §5 ①。

```js
// ❌ 作废示例：三项全部撞名，会抛异常
var uiSession = ctx.get("uiSession");
if (uiSession && typeof uiSession.provide === "function") {
  uiSession.provide({
    hooks: ["chat", "input"],
    props: ["inputActions"],
    resolve: function (binding) { /* … */ },
  });
}
```

拿到后组件里的形状（见 §10 命名规则）：
- `props.useChat(selector)` → `ChatSnapshot`（**必须传 selector**，无参会抛 `TypeError`；见 §10 ② 更正）
- `props.useInput(selector)` → `InputState`（`{ draft, attachmentIds, draftRev, phase, claim?, occurrences, queue }`，**没有菜单开合标志**）
- `props.inputActions` → `InputActions`（`{ setDraft, addAttachments, removeAttachment, pruneAttachments, submit }`，**没有 `actions` 字段**）

## 5. 下一步行动清单 (Action Items)

- [x] **① 实施双版本兼容** —— **已实施，且方案与原计划实质不同：一条 `provide` 都不要写。**
      - ❌ **原计划（§4.3 草稿）作废**：`uiSession.provide({ hooks: ["chat","input"], props: ["inputActions"] })`
        会**抛异常**。scope binding 全局合并且**名称唯一**：`materialize()` 遍历所有 descriptor，
        `claimStandardProp`（`dsh-client-ui-session/lib/client.js:294-312`）命中重名即
        `throw new Error("uiSession.provide: duplicate …")`。而这三个名字官方**全都已声明**
        （ui-conversation 声明 chat 之外的 input+inputActions，ui-chat 声明 chat）→ 三项全撞。
      - ✅ **实际做法**：不写任何 `provide`，直接用组件已收到的 `props.inputActions` / `props.useChat` / `props.useInput`。
      - ⚠️ **`useChat()` / `useInput()` 必须传 selector**：官方 hook 由 `bindSnapshotSelector` 生成，
        其 `sel` 形参**没有默认值**（`dsh-client-ui-renderer/lib/client.js:158-160` 原样透传，内联 shim `:107/:116` 直接调用 `selector(…)`），
        无参调用抛 `TypeError` 并炸掉整个 composer 槽。必须写 `useChat(identitySelector)`。详见 §7 坑 7、§10 ②。
- [ ] **② 本地验证** —— **进行中**。断言清单已落盘：`docs/verification-0.1.5.md`。
      - ✅ **A1 通过**：空草稿按 ↑ 填入最后一条用户消息（历史链路 + `setDraft` 打通）
      - ✅ **C1 通过**：长草稿光标在中间行按 ↑，草稿一字不变（**§5 原「待实测的未知点」已解除**：
        级联语义成立。实现上用 **capture 阶段记录按键前端点 + bubble 阶段决策** 双保险，
        并靠 `e.defaultPrevented` 避让官方菜单。）
      - ⬜ **待补测**：A2–A4、B（↓ 回退与 savedInput 还原）、C2–C4、D（IME）、E（Ctrl+C，尤其 **E2 有选中时不得清空**）、F、G
      - ⚠️ 实测中踩到的坑：`useChat()` 无参调用炸槽（§7 坑 7），已修
- [ ] **③ 回归 0.1.1 路径**：确认旧宿主行为未被破坏（若已无旧宿主，至少做代码层分支自检）。
- [x] **④ 清理**：`lib/client.js.bak-pre015-adapt-20260912-130211` **已不在仓库内**（留档于
      `D:/AI/测试/dsh-composer-keys-client.js.bak-pre015-adapt-20260912-130211`），无需清理。
      本轮改前备份：`D:/AI/测试/dsh-composer-keys-client.js.bak-pre015-impl-20260912-134547`
- [ ] **⑤ 更新 README / CHANGELOG**，提交并按需推送到 `origin`（`https://github.com/483218131/dsh-composer-keys.git`）。
      当前分支 `feat/arrow-cascade-cursor` **领先 origin 3 个提交，尚未 push**；**push 前必须先问用户**。

## 6. 环境与操作要点

- 本仓库位置：`D:/Projects/dsh-composer-keys`（2026-09-12 由 `D:/dsh-composer-keys` 迁入，与同族 `dsh-composer-collapse` 对齐；旧路径已删除，勿再引用）
- profile 安装形态：`C:/Users/lidadao/.dsh/profiles/web/node_modules/dsh-composer-keys` → **符号链接**指向本目录
- **本目录在工作区之外**：文件写入需提权（`sandbox_permissions: danger-full-access`）。
  ⚠️ 注意：即便会话的文件策略是 `workspace-write`，本工作区在 `pwsh` 下**授权阶段本身就会失败**
  （`SetNamedSecurityInfoW failed (Win32 5): grantWrite(...)`），任何 shell 命令都起不来 → 仍须提权到 `danger-full-access`。
- 当前分支：`feat/arrow-cascade-cursor`，HEAD `4d14c04`（领先 origin 3 个提交，未 push）
- 宿主半边 `lib/index.js` 是 **no-op**，全部逻辑在客户端 `lib/client.js`
- 宿主版本：`dsh 0.1.5-rc.1`；0.1.5 内嵌客户端包位于
  `C:/Users/lidadao/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/`

## 7. 已知坑

1. **槽位确实会给 props —— 但不是靠 slot 的 ownerProps，而是靠 `uiSession` 的全局合并 binding。**
   （旧表述「别再相信槽位会给 props」已作废。）推论有两条：不要**自己** `provide` 官方已有的名字（全局重名即抛错，§5 ①）；
   也不要因为 `renderSlot(key, {})` 传了空对象就以为「拿不到 props」（空对象不覆盖 kit，§2）。
2. **`el.value` / `selectionStart` 在 contenteditable 上不存在**，读了是 `undefined`，不会报错，只会静默失效。
3. **上限类效果要用"超过上限的样本"验证**——同工作区姊妹插件 `dsh-composer-collapse` 曾因此被误判为"失效"（短样本下三态看不出差别）。
4. **自建探针脚本会骗人**：本项目排障中，自写扫描脚本两次给出与 `grep` 相反的结论。凡"X 不存在"的结论，必须用独立手段复核。
5. **`ctx.uiSession.provide` 声明了拿不到的 hook 会抛异常并连累整个槽**（§5 ①）；声明前先确认来源包在位。
6. **`ui-slots` 不是可解析的运行时包**：`@deepseek-ai/dsh-client-ui-slots` 在 node_modules 里**不存在**
   （`createRequire().resolve()` 失败），它的实现被内联进 `dsh-client-ui-renderer` 与 web 前端 bundle。
   → 查「hook 怎么变成 prop」必须读 renderer 或前端 bundle，不要在 node_modules 里找 `dsh-client-ui-slots`。
7. **官方 hook 的 selector 形参没有默认值（本轮实测踩到，代价是炸掉整个 composer 槽）**：
   `useChat()` / `useInput()` 无参 = `selector === undefined`，内联 shim 直接 `selector(...)` → `TypeError`，
   被 `SlotErrorBoundary` 接住 → 页面留下 `[data-slot-error="conversation.composer.dock"]`；
   插件**静默失效**，现象与「监听器根本没挂上」几乎一样，极易误判。
   必须写成 `useChat(identitySelector)`。定位手段：Console 的 `slot entry crashed in '<slotKey>': <Error>`。
8. **看到 `[data-slot-error]` 先别认领**：本机 0.1.5 下 `conversation.input.dock` 长期报错，与本插件无关。
   判断归属看 `data-slot-error` 的**槽位名**（本插件只注册 `conversation.composer.dock`），
   必要时做「恢复旧实现 + 硬刷新」的 A/B 对照，不要凭现象下结论。

## 8. 上游交叉引用

排障与结论的完整证据在迁移专项工作区：`D:/AI/测试/HANDOFF.md` §3 ⑬、
`D:/AI/测试/docs/domain/dsh-0.1.5-兼容性事实源.md` §3.3（含 0.1.5 客户端绑定机制与"槽位传空 props"的实测记录）。

## 9. 迁移执行记录（2026-09-12，已完成并验证）

| 步骤 | 动作 | 证据 |
|---|---|---|
| 1 | `D:/dsh-composer-keys` → `D:/Projects/dsh-composer-keys`（`Move-Item`，移动前先做重命名探针确认无锁） | 旧路径 `Test-Path` = False，新路径 = True，13 个顶层条目完整 |
| 2 | profile `package.json` 第 86 行改 `"link:D:/dsh-composer-keys"` → `"link:D:/Projects/dsh-composer-keys"` | 文件已更新 |
| 3 | `pnpm install`（profile 目录内） | `Done in 5.7s`，`Packages: -36`（清理未用包，非本插件相关） |
| 4 | 验证符号链接 | `LinkType: SymbolicLink`，`Target: D:\Projects\dsh-composer-keys` |
| 5 | 验证 `dump-config` | `# == dsh-composer-keys` / `- id: composer-keys` / `name: dsh-composer-keys` 正常注册；无配置告警（唯二匹配是 Node 的 UNDICI 实验性提示与提示词正文） |
| 6 | 文档路径同步 | `HANDOFF.md` §6、`AGENTS.md` §2 快捷命令改为新路径；`pnpm-lock.yaml` 已由 pnpm 改写为新路径 |
| 7 | 提交 | `1aed159 chore: 仓库迁至 D:/Projects/dsh-composer-keys 并同步文档路径`（2 文件，未 push） |

备份与回滚：迁移为「移动 + 改一行 link + 重建链接」，回滚 = 反向 `Move-Item` + 改回 link + 再 `pnpm install`。
profile 目录内的历史备份（`package.json.bak-*` / `pnpm-lock.yaml.bak-*`，约 44 个）仍保留旧路径字样，属**历史快照，不要按新路径去改**。

## 10. 0.1.5 官方接口事实（本轮新查证，供实现直接引用）

**① 槽位空 props（复核确认）**
`dsh-client-ui-conversation/lib/client.js:16259`：`renderSlot("conversation.composer.dock", {})`；
该槽在 `:16744` 声明为 `{ kind: "list", scope: "session" }` → 组件能拿到 session scope 的标准 props。

**② hook / keyedHook / prop → 组件 props 的落地规则**
`dsh-client-ui-renderer/lib/client.js:538-549`（`materializeStandardBinding`）：先铺开 `binding.props`，再逐个转换 hook。
命名规则**实证**取自 web 前端 bundle（`dsh-web-frontend/dist/assets/index-BKQ_L1z6.js`）：

```js
function standardHookPropName(t) { return `use${t[0]?.toUpperCase() ?? ""}${t.slice(1)}`; }
```

即 `hooks: ["chat"]` → 组件拿到 **`useChat`**；`keyedHooks: ["projection"]` → **`useProjection`**；`props` 原样展开。

> ⚠️ **更正（2026-09-12 实测）：`useChat()` 无参调用会抛 `TypeError`，不会返回整个快照。**
> 原表述「`sel` 缺省为 `identity`」是**错的**：`bindSnapshotSelector`（`dsh-client-ui-renderer/lib/client.js:158-160`）
> 把 `sel` **原样透传**给 `useSyncExternalStoreWithSelector`，而内联的 shim（同文件 `:107`、`:116`）直接执行
> `selector(snapshot)`；`selector` 为 `undefined` 即抛错。**必须显式传 selector**：
> ```js
> function identitySelector(value) { return value; }
> var snapshot = useChat(identitySelector);
> ```
> 未传的后果是整个 `conversation.composer.dock` 槽渲染崩溃（`data-slot-error`），而不是静默降级。
> 相关：§7 坑 7。

**③ 草稿读写官方契约**
`SessionInputShell.setDraft(text)`（`dsh-client-ui-conversation/lib/types/client/input/facade.d.ts:113-119`）：
「Replace the whole draft… **the caret lands at the end**」→ 写回后光标落在末尾，与 B 方案的级联语义天然一致。
`InputActions` 公开面（`input.d.ts:210`）仅 5 个方法，确认**没有** `actions` 字段。

**④ IME 守卫的官方同款写法**
`dsh-client-ui-conversation/lib/client.js:15199-15202`：

```js
function isComposingEvent(event, recentlyComposing) {
  return event.isComposing || event.keyCode === 229 || recentlyComposing();
}
// recentlyComposing = composing || Date.now() < composingUntil（compositionend 后 10ms 窗口）
```

本插件现用 `e.isComposing || e.keyCode === 229` 与官方前两项一致。
