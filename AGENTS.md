# dsh-composer-keys · Agent 工作区指引 (AGENTS)

本文件是本仓库的静态开发宪法。**本仓库是独立项目**（有自己的 git remote 与版本线），不属于 `D:/AI/测试` 迁移工作区。

## 1. 核心规范 (Project Conventions)

- **单点事实源（SSOT）**：现状、根因、双版本兼容设计**唯一权威定义在 `HANDOFF.md` §2–§4**，其他文件只引用不复写。
- **双版本兼容是硬约束**：本插件必须同时在 DSH `0.1.1-rc.2`（旧）与 `0.1.5-rc.1`（新）下工作。
  版本判定一律用**能力探测**（如 `typeof props.useChat === "function"`、`el.matches("[data-composer-input]")`），**禁止硬编码版本号**。
- **钩子只用官方稳定标识**：只用官方 `data-*` 属性（`data-composer-input` / `data-composer-card` / `data-input-scroll`）
  与官方服务（`ctx.uiSession`、`ctx.conversation`），**禁止依赖 hash class**（如 `.uV2eYG_input`）。
- ~~**不要依赖槽位白送 props**：0.1.5 起槽位传空对象，必须通过 `ctx.uiSession.provide({props:[...]})` 主动声明。~~
  **此条已于 2026-09-12 实测推翻。** 槽位 props 来自 `uiSession` 的**全局合并 binding**，
  不是槽位的 `ownerProps`：`renderSlot(key, {})` 传空对象**不覆盖** kit，
  官方包（`ui-chat` / `ui-conversation`）声明的 `chat` / `input` / `inputActions` 组件**自动就能收到**。
  → **禁止再 `provide` 这些官方已有的名字**：binding 名称唯一，重名会抛错并炸掉整个 composer 槽（HANDOFF §5 ①）。
  → 且官方 hook（`useChat` / `useInput`）的 selector 形参**没有默认值**，无参调用会抛 `TypeError`，必须传 selector（HANDOFF §7 坑 7）。
- **改前必备份**：本目录在工作区之外（写入需提权），任何改动前先带时间戳备份目标文件。
- 语言：代码/变量/API 用英文；注释、文档、提交信息用中文（简体）。

## 2. 常用操作命令 (Quick Commands)

```powershell
# 本机验收（本目录以 link: 挂在 profile 上，改源码后刷新浏览器即生效）
# profile: C:/Users/lidadao/.dsh/profiles/web  （写入需提权）
# 刷新浏览器（Ctrl+Shift+R）后在输入框验证：↑/↓ 翻历史、Ctrl+C 清空

git -C D:/Projects/dsh-composer-keys log --oneline -5
git -C D:/Projects/dsh-composer-keys status --short
```

## 3. 工程资产导航 (Context Anchors)

- 交接与新会话入口：**[HANDOFF.md](HANDOFF.md)** ← 新会话必读
- 使用者文档：`README.md`（英）/ `README.zh.md`（中）
- 版本变更：`CHANGELOG.md`
- 宿主半边（no-op）：`lib/index.js`；全部逻辑在客户端 `lib/client.js`

> 本仓库按 `doc-lifecycle` 的**复杂度门限**评估为 **Level 2**（约 11 个文件、单一功能），
> 故**不建立** `docs/adr/`、`docs/rfc/`、`docs/domain/` 完整树——**避免过度工程化**。
> 若未来出现多方案抉择或算法换挡，再按 Level 3 升级资产。
