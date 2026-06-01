# Isle

> An always-on Windows "dynamic island" **host** that knows only *how to connect, push, and draw* — with **zero business logic**. All data comes from independent, out-of-process plugins ("bricks"). **The protocol is the product.**
>
> 常驻 Windows 灵动岛**宿主**:只懂"怎么连、怎么推、怎么画",**不含任何业务逻辑**。一切数据来自独立进程的插件("积木")。**协议即产品。**

## What is Isle / 这是什么

Isle is a floating, always-on-top island that sits at the top of your screen and aggregates live information at a glance — without you switching between N apps and terminals. The host is **domain-blind**: it never understands what your data *means*. Each brick runs in its own process, normalizes its data into one of a small set of **render kinds**, and pushes it to the host over SSE. The host only switches on `kind` and colors by `tone`.

Isle 是一个浮于桌面顶部、常驻置顶的小岛,把实时信息聚合成"抬眼一瞥",免去在 N 个 app 与终端之间来回切换。宿主**对数据域完全无知**——它永远不知道你的数据*是什么意思*。每块积木在独立进程里运行,把自己的数据归一化成少数几种**渲染词表(render kind)**之一,通过 SSE 推给宿主。宿主只按 `kind` 分发、按 `tone` 上色。

## Architecture / 架构

### Three-layer decoupling / 三层解耦

```
brick (independent process) → normalized Signal bus → render kinds (host built-in) → island shell UI
```

The arrow is the coupling direction. A brick knows *its data source + which render kind it emits*; the host knows *render kinds + how to draw them*. The two **never** discuss domain meaning.

### Protocol — the three frames / 协议三帧

| frame | direction | shape |
|---|---|---|
| **manifest** | discovery | `plugin.json` in `~/.island/plugins/<id>/`; declares `port`, `emits`, `collapsed` glyph/badge, optional `actions`, `heartbeat`, `launch` |
| **signal** | brick → host (SSE) | `{ kind, ts, data }` |
| **action** | host → brick (POST `/action`) | `{ name }` |

Transport is **SSE (the host opens a long stream) + POST**, not WebSocket — so a brick can be written in ~20 lines in any language.

### Render kinds — a closed vocabulary (6) / 渲染词表(锁定 6 种)

| kind | shape the host sees |
|---|---|
| `list` | `{ items: [{ text, state?, badge? }] }` |
| `metrics` | `{ items: [{ label, value, delta?, tone? }] }`, tone ∈ up/down/flat |
| `status` | `{ items: [{ label, state, tone?, detail? }] }`, tone ∈ neutral/active/attention/error |
| `text` | `{ blocks }` or `{ text }` |
| `control` | `{ controls: [{ label, action }] }` |
| `view` | `{ html, controls? }` (sandboxed iframe) |

`state` is an opaque string to the host; only `tone` carries meaning. The meaning→tone mapping lives in the brick.

## Packages / 包结构 (pnpm monorepo)

- **`@isle/protocol`** — the wire contract + runtime guards (`parseSignal` / `parseManifest`). Versioned independently.
- **`@isle/host`** — the Electron + React island host: shell, Signal bus, render kinds, lifecycle.
- **`@isle/mock-brick`** — a scripted mock brick that exercises every render kind and the failure paths. It is the host's acceptance surface.

## Getting started / 开始

Requires **Node ≥ 20** and **pnpm 9** (via Corepack).

```bash
pnpm install

# build / typecheck / lint across all packages
pnpm build
pnpm typecheck
pnpm lint

# run the host (Electron dev)
pnpm dev:host

# run the mock brick
pnpm dev:mock
```

## Status / 状态

Host v1 (protocol + bus + render kinds + shell + lifecycle) is functional and is validated by the **scripted mock brick** — no real data source required. Domain logic (real bricks for prices, agents, notes, etc.) lives downstream of the protocol and is out of v1 scope.

宿主 v1(协议 + bus + 渲染词表 + 壳 + 生命周期)已可运行,由**脚本化 mock 积木**验收,无需真数据源。真积木的领域逻辑(行情、agent、笔记等)建在协议之上,不属 v1 范围。

## Contributing / 贡献

Tech stack: **Electron + React + Framer Motion + TypeScript**. Commits follow **Conventional Commits** (`feat|fix|chore(scope): …`, scope ∈ `protocol`/`host`/`mock`), and every PR ships a [changeset](https://github.com/changesets/changesets). See `CLAUDE.md` for the architectural invariants and conventions before opening a PR.

## License / 许可证

[MIT](./LICENSE) © 2026 Gavin
