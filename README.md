# Isle

[![CI](https://github.com/gavinisagi/isle/actions/workflows/ci.yml/badge.svg)](https://github.com/gavinisagi/isle/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)
![pnpm](https://img.shields.io/badge/pnpm-9-f69220)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

> An always-on desktop "dynamic island" **host** that knows only *how to connect, push, and draw* — with **zero business logic**. All data comes from independent, out-of-process plugins ("bricks"). **The protocol is the product.**
>
> 常驻桌面灵动岛**宿主**:只懂"怎么连、怎么推、怎么画",**不含任何业务逻辑**。一切数据来自独立进程的插件("积木")。**协议即产品。**

<!-- Screenshot / demo — drop a GIF of the island here. / 截图或演示 GIF 放这里。 -->
<p align="center"><em>📸 Screenshot / demo coming soon. / 截图与演示稍后补上。</em></p>
<!-- ![Isle in action](docs/assets/demo.gif) -->

## What is Isle / 这是什么

Isle is a floating, always-on-top island that sits at the top of your screen and aggregates live information at a glance — without you switching between N apps and terminals. The host is **domain-blind**: it never understands what your data *means*. Each brick runs in its own process, normalizes its data into one of a small set of **render kinds**, and pushes it to the host over SSE. The host only switches on `kind` and colors by `tone`. Built on Electron — **Windows-first today, cross-platform-capable** by design.

Isle 是一个浮于桌面顶部、常驻置顶的小岛,把实时信息聚合成"抬眼一瞥",免去在 N 个 app 与终端之间来回切换。宿主**对数据域完全无知**——它永远不知道你的数据*是什么意思*。每块积木在独立进程里运行,把自己的数据归一化成少数几种**渲染词表(render kind)**之一,通过 SSE 推给宿主。宿主只按 `kind` 分发、按 `tone` 上色。基于 Electron——**当前以 Windows 为先,架构上跨平台可期**。

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

## Write your own brick in ~20 lines / 二十行写一块积木

A brick is just a process that (1) drops a manifest where the host can find it and (2) streams `signal` frames over SSE. No SDK, any language.

积木就是一个进程:(1) 把 manifest 放到宿主能发现的位置,(2) 通过 SSE 推 `signal` 帧。无需 SDK,任意语言皆可。

```jsonc
// ~/.island/plugins/clock/plugin.json
{ "id": "clock", "name": "Clock", "port": 7820,
  "emits": ["text"], "collapsed": { "glyph": "🕐" }, "heartbeat": 2000 }
```

```js
// server.js — then: node server.js (host discovers & connects automatically)
import http from 'node:http';

http.createServer((req, res) => {
  if (req.url !== '/events') return void res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  setInterval(() => {
    const signal = { kind: 'text', ts: Math.floor(Date.now() / 1000),
      data: { text: new Date().toLocaleTimeString() } };
    res.write(`event: signal\ndata: ${JSON.stringify(signal)}\n\n`);
  }, 1000);
}).listen(7820);
// Optional: accept POST /action for host → brick controls. / 可选:接 POST /action 收宿主控件回推。
```

## Packages / 包结构 (pnpm monorepo)

- **`@isle/protocol`** — the wire contract + runtime guards (`parseSignal` / `parseManifest`). Versioned independently.
- **`@isle/host`** — the Electron + React island host: shell, Signal bus, render kinds, lifecycle.
- **`@isle/mock-brick`** — a scripted mock brick that exercises every render kind and the failure paths. It is the host's acceptance surface.

## Getting started / 开始

Requires **Node ≥ 20**. pnpm 9 is managed by **Corepack** — enable it once so `pnpm` is on your PATH (the scripts below shell out to `pnpm`). / 需 **Node ≥ 20**;pnpm 9 由 **Corepack** 管理,先一次性启用,让 `pnpm` 进 PATH(下面脚本会调用 `pnpm`)。

```bash
# one-time: put the pnpm 9 shim on PATH (Windows: run in an elevated shell, / 一次性:把 pnpm 9 shim 装到 PATH(Windows 需管理员终端,
# or `corepack enable --install-directory <dir>` into a folder you add to PATH) / 或 enable 到自定义目录再加进 PATH)
corepack enable pnpm

pnpm install

# build / typecheck / lint across all packages
pnpm build
pnpm typecheck
pnpm lint

# run host + mock together, one command / 一键同时起 host + mock
pnpm dev

# …or run them separately / 或分开起
pnpm dev:host   # the host (Electron dev) / 宿主
pnpm dev:mock   # the mock brick / mock 积木
```

## Status & Roadmap / 状态与路线

Host v1 (protocol + bus + render kinds + shell + lifecycle) is functional and is validated by the **scripted mock brick** — no real data source required.

宿主 v1(协议 + bus + 渲染词表 + 壳 + 生命周期)已可运行,由**脚本化 mock 积木**验收,无需真数据源。

- **v1 — Host** ✅ protocol + bus + render kinds + shell + lifecycle, validated by the mock brick. / 协议 + bus + 渲染词表 + 壳 + 生命周期,由 mock 验收。
- **Next — Downstream bricks** real bricks built on the protocol (prices, agents, notes). / 建在协议之上的真积木(行情、agent、笔记)。
- **Later — Extension bricks & reach** weather / wallpaper (exercising `control` + `view`), and broader cross-platform support. / 天气 / 壁纸(验证 `control` + `view`),以及更广的跨平台支持。

## Contributing / 贡献

Tech stack: **Electron + React + Framer Motion + TypeScript**. Commits follow **Conventional Commits** (`feat|fix|chore(scope): …`, scope ∈ `protocol`/`host`/`mock`), and every PR ships a [changeset](https://github.com/changesets/changesets). Read `CLAUDE.md` for the architectural invariants and `docs/DESIGN.md` for the rationale before opening a PR.

技术栈:**Electron + React + Framer Motion + TypeScript**。提交遵循 **Conventional Commits**,每个 PR 附带一个 changeset。开 PR 前请读 `CLAUDE.md`(不变量)与 `docs/DESIGN.md`(设计论证)。

## License / 许可证

[MIT](./LICENSE) © 2026 Gavin
