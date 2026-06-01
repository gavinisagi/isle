# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 注释规范 / Comment Convention

本仓库为开源社区仓库,所有注释必须按照 **英文 + 中文** 的顺序标注。
This repository is an open-source community project. All comments must be written in the order of **English first, then Chinese**.

```js
// Initialize the canvas / 初始化画布
const canvas = createCanvas();
```

## Document Structure / 文档结构

Docs split by information lifecycle. Two public docs live in the repo; the maintainer keeps two private docs local. / 文档按信息生命周期分层。两份公开文档入库;维护者另有两份私有文档保留在本地。

- **`CLAUDE.md`** — stable contract & principles, read at session start, rarely changes (public). / 稳定契约与原则,session 启动即读,很少变(公开)。
- **`docs/DESIGN.md`** — public design rationale + a Decisions Log view (architecture, protocol, render kinds, risks, decisions). The published face of the local PRD (public). / 公开设计论证 + Decisions Log 视图(架构/协议/渲染词表/风险/决策);本地 PRD 的公开面(公开)。
- **`docs/PRD.md`** — the fuller PRD: personas, strategy, success metrics, and the **canonical append-only Decisions Log** (add, never rewrite or compress; keep it traceable). **Maintainer-local, not tracked in this repo.** / 更完整的 PRD:personas/战略/成功指标,以及 **canonical append-only 决策日志**(只增不改不压缩,可追溯)。**维护者本地持有,不入库。**
- **`docs/STATUS.md`** — current progress board, the day-to-day source of truth. Append to Backlog when adding a feature; move to Done and keep it trim once shipped. **Maintainer-local, not tracked in this repo.** / 当前进度看板,日常事实来源;加功能往 Backlog 追加,完成后移到 Done 并保持精简。**维护者本地持有,不入库。**

**Adding a feature / 加新功能的规矩:** first append a decision to the canonical Decisions Log in `docs/PRD.md` (with rationale / conflicts) and reflect public-safe decisions in the `docs/DESIGN.md` view, then append an item to STATUS Backlog; only sync `CLAUDE.md` if the protocol contract changed. Throughout, append or move status — never compress or rewrite existing content. / 先往 `docs/PRD.md` 的 canonical Decisions Log 追加一条决策(含理由/冲突),并把可公开的决策同步进 `docs/DESIGN.md` 视图,再往 STATUS Backlog 追加一项;动了协议契约才同步 CLAUDE.md。全程 append 或移动状态,绝不压缩/重写既有内容。

## Commands / 命令 (pnpm monorepo)

IMPORTANT: scripts are not defined yet (pre-scaffold). The pnpm `-F` filter syntax below is fixed, but **confirm each script name against that package's package.json once scaffolded — don't assume a name exists.** Packages: `@isle/protocol`, `@isle/host`, `@isle/mock-brick`.

- Install (repo root): `pnpm install`
- One package: `pnpm -F @isle/protocol build` · `pnpm -F <pkg> typecheck` · `pnpm -F <pkg> lint`
- All packages: `pnpm -r build` · `pnpm -r typecheck` · `pnpm -r lint`
- Run host (Electron dev): `pnpm -F @isle/host dev`
- Run mock brick: `pnpm -F @isle/mock-brick dev`

## What Isle Is / 项目本质

An always-on Windows "dynamic island" **host** that knows only *how to connect, push, and draw* — **zero business logic**. All data comes from independent out-of-process plugins ("bricks"). The protocol *is* the product.

## Hard Constraints / 硬约束 (do not violate)

### Tech stack / 技术栈
- **Electron + React + Framer Motion + TypeScript**, pnpm monorepo, forked from `first-order-coder/Dynamic_island` as the starting shell.

### Three-layer decoupling / 三层解耦
```
brick (independent process) → normalized Signal bus → render kinds (host built-in) → island shell UI
```
- Arrow = coupling direction. Brick knows *its data source + which render kind it emits*; host knows *render kinds + how to draw*. The two **never** discuss domain meaning.

### Protocol — the three frames / 协议三帧
| frame | direction | shape |
|---|---|---|
| **manifest** | discovery | `plugin.json` in `~/.island/plugins/<id>/`; declares `port`, `emits`, `collapsed` glyph/badge, optional `actions`, `heartbeat` (ms, host derives stale), `launch` (v2, ignored in v1) |
| **signal** | brick → host (SSE) | `{ kind, ts, data }` |
| **action** | host → brick (POST `/action`) | `{ name }` |
- Transport is **SSE (host opens long stream) + POST**, not WebSocket — a brick must be writable in ~20 lines in any language.
- Frames are **MCP-shaped** (JSON-RPC-ish, manifest = capabilities) but do **not** depend on the MCP SDK; a thin shim bridges them. Keep them MCP-shaped when extending.

### Render kinds — locked vocabulary (6) / 渲染词表
| kind | shape the host sees |
|---|---|
| `list` | `{ items: [{ text, state?, badge? }] }` |
| `metrics` | `{ items: [{ label, value, delta?, tone? }] }`, tone ∈ up/down/flat |
| `status` | `{ items: [{ label, state, tone?, detail? }] }`, tone ∈ neutral/active/attention/error |
| `text` | `{ blocks }` or `{ text }` |
| `control` | `{ controls: [{ label, action }] }` |
| `view` | `{ html, controls? }` (sandboxed iframe: `allow-scripts`, **no** `allow-same-origin`; CSP allows only local-port img/connect-src) |
- **Vocabulary is closed.** Resist new first-class kinds; `timeline`/`map` route through `view` — a new kind risks re-teaching the host a business domain.

### Acceptance: mock-all-green = done / mock 全绿 = 完成
- Host's "done" is validated by a **scripted mock brick**, never by real data sources. The mock exercises every render kind + the failure paths (reconnect, slow-response timeout, control→action round-trip, brick-offline).
- **Host v1 is complete when the mock renders/degrades correctly with no real brick attached.** Use the mock as the test surface — don't wire real sources to validate the host.

### Non-negotiable behaviors / 不可妥协的行为
- **Graceful degradation is protocol-level**: a disconnected brick shows last-known value or a "disconnected" state and **never crashes the whole island**. Stale is derived from manifest `heartbeat` (conservative default), not hard-coded in host.
- **Collapsed state is click-through** — never blocks desktop/full-screen apps, never steals focus.
- **SSE reconnect with last-event-id resume** — dropped streams must not lose data.
- Shell (transparency / always-on-top / click-through / multi-monitor + per-DPI / spring synced with window resize) is hand-drawn and the largest time sink (PRD R1). Get the empty-shell feel right *before* wiring data.

### Scope / 范围
- **Host v1 = protocol + bus + render kinds + shell + lifecycle. Nothing else.** Domain logic (agent-state semantics, quote APIs, Obsidian parsing) lives in **downstream bricks** — parallelizable, deferrable, **out of v1**.
- Out of scope: no plugin marketplace · no host auto-spawn (v1 = manual process start) · no multi-user/cloud/sync · no cross-platform (Windows-first) · no auth model · no visual node/dataflow editor (typed TS config + hot-reload instead).

## Conventions / 项目不变量 (non-default — these change how you code)

- **YOU MUST keep the host domain-blind.** Never parse brick data for business meaning in host code; when a feature needs to understand content, normalize it in the brick and push a render kind. Host code only switches on `kind` and colors by `tone`.
- **`tone` is the host's only semantic output; `state` is an opaque `string`.** Never branch host logic on `state` (no `if (state === 'waiting')`); read `tone`, and do the meaning→tone mapping in the brick.
- **IMPORTANT: protocol frames are an immutable contract.** Never add or rename manifest/signal/action fields ad hoc; when a brick needs to express something new, map it onto an existing render kind — don't extend the frame.
- **YOU MUST validate untrusted brick data at the main-process ingest boundary** with `@isle/protocol` guards (`parseSignal`/`parseManifest`). Never trust a frame in the renderer; drop bad frames, never crash the island.

## Commit & Versioning / 提交与版本

- **Conventional Commits**: `feat|fix|chore(scope): …`, scope ∈ `protocol`/`host`/`mock`.
- **changesets** owns versions + changelog: every PR ships a changeset. `@isle/protocol` is versioned independently; `host`/`mock` follow it.
- **YOU MUST NOT hand-write CHANGELOG** — changesets generates it.
