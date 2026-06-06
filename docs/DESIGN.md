# Isle — Design & Decisions / 设计与决策

> Why Isle is built this way: architecture rationale + an append-only Decisions Log. / 本文讲"为什么这么设计":架构论证 + Decisions Log。
>
> | 字段 | 值 |
> |---|---|
> | 版本 | v0.3 · 范围收口 |
> | 日期 | 2026-05-30 |
> | 作者 | Gavin |
> | 状态 | Decided · host 与积木解耦,host 由 mock 验收;可进 v1 实现 |
> | 方法论 | 套用 `deanpeters/Product-Manager-Skills · prd-development`(10 段式);非瀑布规格,是随交付演进的活文档 |
>
> **关于章节号 / On section numbers:** §2–§4 与 §6(问题陈述 / personas / 战略 / 成功指标)属维护者本地战略文档,不公开;本文保留架构与决策相关章节,故节号不连续。/ Sections 2–4 and 6 (problem statement / personas / strategy / metrics) are maintainer-local and not published, so the numbering here is intentionally non-contiguous.

---

## 1. Overview / 概述

我们要做一个常驻桌面的**灵动岛宿主(host)**(Windows 优先,架构上跨平台可期,见 §10 Q9),它本身只定义"怎么连、怎么推、怎么画"三件事,不含任何业务逻辑;一切数据来自**独立进程的插件(brick)**——每块积木占一个本地端口,通过 SSE 把归一化 signal 推给宿主,宿主只按 render kind 渲染。目标是把"深度工作时在 N 个 app/终端之间来回核对信息"压成"抬眼一瞥一个岛"。核心价值在于宿主对数据域完全无知、积木可任意语言、加一块新积木的成本极低。

---

## 5. Solution Overview

> 高层描述,不规定像素级 UI(UI 细节交给实现迭代)。架构是本项目的真正产品,故协议层写得精确。

### 5.0 范围边界(本设计的核心交付 = host)

**Isle host 的实现范围只有:协议 + bus + render kind + 壳 + 生命周期。** 真积木的领域逻辑——agent 状态怎么定义、行情从哪个 API 来、Obsidian 怎么解析——**都不在 host 范围内**,它们是建在协议之上的独立下游交付。host 对展示内容(chunk)一无所知,因此 host 的"做完了"由一个**脚本化 mock 积木**验收:mock 按时间推流(如前 10s 推 A 状态流、后 10s 推 B),host 只要全部正确处理/降级即可,全程不接任何真数据源。

### 5.1 三层解耦
```
插件 (brick, 独立进程)  →  归一化 Signal bus  →  Render kinds (宿主内置)  →  岛壳 UI
```
箭头即耦合方向:积木只认识「自己的数据源 + render kind」,宿主只认识「render kind + 怎么画」,两边永不直接对话。**"数据怎么推过去无所谓"由此成立——宿主永远不认业务域。**

### 5.2 拓扑与传输
- 每个插件是独立进程,在自己端口起一个最小 HTTP server(满足"占用端口")。
- 宿主连接插件端口、挂一条 **SSE 长流**;插件有新数据就往流里推(server→client push)。
- 宿主回推动作(刷新、点了某按钮)= 对插件端口发 `POST /action`。
- 选 SSE + POST 而非 WebSocket:任何语言 ~20 行即可实现一个插件,无需 WS 库。

### 5.3 岛壳
- 技术栈:Electron + React + Framer Motion(从 `first-order-coder/Dynamic_island` fork 起步,复用现成透明置顶壳)。
- 形态:收起 pill(每块积木一个 glyph + badge)→ peek → 展开(完整 widget),弹簧动画;always-on-top;**收起态 click-through 不挡桌面**。
- 注:Windows 灵动岛是用户态悬浮窗(与 Apple 硬件挖孔 + OS 合成 + ActivityKit 无关),壳层一切需自绘,这是最大时间投入项(见 §9 R1)。

### 5.4 配置
- 源发现走目录注册(`~/.island/plugins/`,见 §10 Q2);单一 TS config 仅声明 `layout`(order / overrides / hidden + 每块的 collapsed glyph/badge 覆盖),**不声明 `sources`**,热重载。(措辞更正缘由见 §10 Q8)
- **不做可视化节点 dataflow 编辑器**(见 §8):单用户、源到 widget 一对一无 transform,节点图不回本;改有类型的 config 更快。

---

## 7. Protocol & Render Kinds

> 用户故事(S1–S6)与 v1 里程碑由维护者本地跟踪,不在本文。本节保留协议规格、渲染词表与边界约束作为稳定参考。

### 协议规格(宿主必须定义的三种帧)
```jsonc
// 1. manifest —— 丢 plugin.json 到 ~/.island/plugins/<id>/ 被宿主发现(注册中心)
//    manifest 声明 port,宿主再连该端口收 SSE;离线也能显示"已注册"
{
  "id": "prices",
  "name": "持仓行情",
  "port": 7812,
  "emits": ["metrics"],                          // 声明推哪种 render kind
  "collapsed": { "glyph": "ti-trending-up", "badge": "pnl" },
  "actions": ["refresh"],                        // 宿主可回推的动作(可选)
  "config": [                                    // 通用配置 schema;host 域无知渲染表单(Q16)
    { "key": "yfinanceKey", "label": "YFinance API Key", "type": "secret" },
    { "key": "refreshMs",   "label": "刷新间隔(ms)",      "type": "number", "default": 600000 }
  ],
  "launch": "node ./plugins/prices/index.js"     // host 托管启动(Q16;原 v2 预留,现启用)
}

// 2. signal —— 插件 → 岛(SSE 长流)
{ "kind": "metrics", "ts": 1730000000,
  "data": [ { "label": "TSLA", "value": "248.5", "delta": "+1.8%", "tone": "up" } ] }

// 3. action —— 岛 → 插件(POST /action)
{ "name": "refresh" }
```

> **帧形状 MCP-shaped(借形不上 SDK):** 帧用 JSON-RPC-ish、manifest 当 capabilities 握手,宿主热路径不依赖 MCP SDK,靠一层薄 shim 双向桥接 → 现成的 MCP 风格 server 可近零成本变成岛上的积木。

### Render kind 词表(宿主内置,已锁;形状对 host 域无知;timeline/map 暂走 view 逃生舱)
| kind | host 看到的通用形状 | 谁用 |
|---|---|---|
| `list` | `{ items: [{ text, state?, badge? }] }` | todo、tickers、旅行 |
| `metrics` | `{ items: [{ label, value, delta?, tone? }] }`,tone ∈ up/down/flat | 行情 |
| `status` | `{ items: [{ label, state, tone?, detail? }] }`,tone ∈ neutral/active/attention/error | agents |
| `text` | `{ blocks }` 或 `{ text }` | daily report |
| `control` | `{ controls: [{ label, action }] }` | 壁纸"换一张" |
| `view` | `{ html, controls? }`(沙箱挂载) | 天气、地图、缩略图 |

> **host 域无知的关键:** `state` 对 host 是不透明字符串,host 只按通用 `tone` 上色——它永远不知道 "waiting" 是什么意思;是 agents 积木把 waiting 映射成 `tone:attention`。

### 下游积木(reference,建在 Isle 协议之上,**不属 host v1 实现范围**)

> 这些积木的领域逻辑(agent 状态语义、行情 API、Obsidian 解析)都在协议之外。host 对它们一无所知,只认 render kind + 通用 tone。先用 mock 把 host 验收掉,这些可独立、并行、延后做。

**B1 — obsidian 积木**
- 跨日记聚合未勾选且带 `#todo` 的项(Tasks 约定:`- [ ]` + 全局过滤标签 `#todo`),映射成 `list`
- 顺带解析到期日(📅 YYYY-MM-DD)、标签
- 勾选完成 → action 回写源文件(写 ✅)

**B2 — prices 积木**
- 从 Obsidian 特定文件读持仓;每 10 分钟刷新行情,映射成 `metrics`(tone ∈ up/down/flat)

**B3 — agents 积木**
- 对接本地 claude-control 接口(自实现);把 `{ id, state, title }`(state ∈ active/idle/waiting)映射成 `status`
- **状态语义在积木里**:active→`tone:active`、idle→`tone:neutral`、waiting→`tone:attention`;host 只认 tone,不认这些词
- waiting 时 host 据 `tone:attention` 高亮(岛/pill 发光,见 §10 Q12;不自动展开)

### 约束与边界情况
端口冲突 / SSE 断线重连 / 插件慢响应或超时降级 / 多屏 + 不同 DPI 的定位 / 开机自启。

---

## 8. Out of Scope(v1 明确不做,防止 scope creep)

- **真积木的领域逻辑** —— agent 状态语义、行情 API、Obsidian 解析等**不属 Isle host v1**;host 由 mock 积木验收,真积木是建在协议之上的独立下游交付(见 §7 B1–B3)
- **公开 package 分发 / 插件商城**(③) —— **仍不做**(Q16):host 只托管「本地 / 自写 / 自行 clone」的 package;公开下载牵涉签名/沙箱/信任的完整安全模型(下载并 spawn 完整权限的 OS 进程,攻击面远大于 view sandbox),留待未来专门版本
- **可视化节点 dataflow 编辑器** —— 过度设计;单用户、无分叉/transform,节点图不回本
- ~~**宿主自动 spawn / 监管插件**~~ —— **v0.2.0 起启用**(Q16 ①):host 据 manifest `launch` 托管**本地** brick 进程(spawn + 退出时 kill)。仍不做公开分发(见上)
- **多用户 / 云端 / 同步**
- **跨平台** —— Windows 优先(白空间所在);macOS/Linux 留后
- **鉴权 / 权限模型** —— 单机自用、全信任;`view` 第三方化(marketplace)前不开放
- **可视化设置面板(表单式)** —— layout 仍直接改 TS config;**例外(Q16 ②)**:brick 自身配置(key/频率)走 host 渲染的**域无知**通用表单(brick 在 manifest `config` 声明字段,host 只按 `type` 渲染、不懂业务含义),值存 `~/.island/plugins/<id>/config.json`、不进 layout config
- **Docker 化 host** —— host 是 GUI 桌面悬浮窗,需真实显示/合成,无头容器无法承载;仅未来 brick(无头进程)可由作者自行容器化(见 §10 Q10)

---

## 9. Dependencies & Risks

### Dependencies
**Host v1(关键路径):**
- Electron + React + Framer Motion;fork `first-order-coder/Dynamic_island` 作起步壳
- 脚本化 mock 积木 —— host 的唯一验收依赖,不依赖任何真数据源

**下游积木(非 host 关键路径,可并行/延后):**
- 本地 claude-control 接口(自实现)—— B3 前置
- Obsidian vault 结构 + Tasks `#todo` 约定 —— B1/B2 前置

### Risks & Mitigations
| # | 风险 | 缓解 |
|---|---|---|
| R1 | **岛壳手感** = 最大时间黑洞(透明/无边框/always-on-top/click-through/多屏 DPI/弹簧与窗口 resize 同步) | 先 fork 现成壳,把"空壳手感"调对,再接任何数据 |
| R2 | N 进程足迹(每个 Node 积木 ~30–50MB) | 积木尽量轻 / 评估共享 runtime;设内存 guardrail |
| R3 | 优雅降级没做对 → 岛不可靠不敢常驻 | v1 就把 last-known / 断连态做进协议层 |
| R4 | `view` 沙箱 HTML 的 XSS/越权(未来 marketplace 才严重) | 沙箱 iframe + CSP;marketplace 前不开放第三方 view |
| R5 | 端口发现 / 冲突 | manifest 声明端口 + 宿主分配端口区间 |
| R6 | SSE 断线丢数据 | 重连 + last-event-id 续传 |

---

## 10. Decisions Log(已锁 · 2026-05-30)

> 公开视图。canonical 的 append-only 决策日志由维护者在本地维护(含未公开的理由细节);本表与之一致,仅个别理由用中性表述。/ Public view; the canonical append-only log is kept by the maintainer locally.

| # | 议题 | 决议 | 理由 |
|---|---|---|---|
| Q1 | render kind 词表 | `list / metrics / status / text / control / view` 6 个发车;`timeline`/`map` 暂走 `view` | 过早加一等公民 kind 会让宿主重新认业务域 |
| Q2 | manifest 交付 | 目录发现(`~/.island/plugins/<id>/plugin.json` 当注册中心)+ manifest 声明端口、宿主连端口收数据 | LEGO 体感(丢文件夹即现、离线可见),`launch` 字段日后做 auto-spawn 不改协议 |
| Q3 | agent 状态模型 | 极简:`{ id, state, title }`,`state ∈ active / idle / waiting` | 与最初需求三态一致;字段可后扩 token/tool call 不破协议 |
| Q4 | Obsidian todo 识别 | Tasks 插件约定:`- [ ]` + 全局过滤标签 `#todo`;顺带解析到期日/标签 | 贴成熟、有文档的格式,减负 |
| Q5 | 是否 MCP-shaped | 是,只借形不上 SDK:帧 JSON-RPC-ish、manifest = capabilities,薄 shim 桥接 | 现成的 MCP 风格 server 可近零成本变积木;作者 MCP-native |
| Q6 | 代号 | **Isle** | — |
| Q7 | host 实现范围 | host = 协议 + bus + render + 壳 + 生命周期;真积木(agent 语义/行情/Obsidian)在协议之上、不属 host v1;host 由脚本化 mock 积木验收 | "数据怎么推无所谓"的终点:host 必须域无知,真积木与 host 解耦、可并行交付 |
| Q8(2026-06-01) | config 是否声明 sources | 否:源发现走目录注册(Q2),config 仅声明 layout(order/overrides/hidden + collapsed 覆盖) | 代码自始按 Q2 实现,§5.4 旧措辞 "config 声明 sources" 与实现不符;此处更正文档对齐现实,非改代码、非压缩历史 |
| Q9(2026-06-01) | 平台范围 | **Windows-first**(v1 优先),架构经 Electron 跨平台可期;macOS/Linux 全面支持延后 | 协议 / 积木 / SSE 与 OS 无关,Windows 只是白空间所在的优先级而非技术锁死;明确为 "first" 而非 "only",避免对外误读为锁死单平台 |
| Q10(2026-06-02) | 启动方式 / 容器化 | 加 `pnpm dev` 一键并发启动 host+mock;**Docker 对 GUI host 不适用**,列入 §8 Out of Scope;brick(无头进程)未来可由作者自行容器化 | host 是 Electron 桌面置顶悬浮窗,需真实显示/合成,无头容器跑不了;host 实时监听插件目录,一键启动与顺序无关 |
| Q11(2026-06-02) | 岛交互:拖动重定位 + pin + 自动收回 | 展开卡片设拖动手柄(`-webkit-app-region: drag`)移动岛,位置持久化到 `~/.island/window-state.json`(非 config);positioning/resize 改为锚点感知(拖过后不再自动居中,仅夹回屏内);pin 经全局热键 + 岛上按钮切换,pin 时强制展开且可交互;非 pin 时鼠标离开自动收回 | 不破"收起态 click-through / 不抢焦点":拖动只在展开态交互手柄,pin 态本就该可交互;位置是窗口状态而非 layout,走独立 state 文件、不进 config(与 Q8 一致) |
| Q12(2026-06-03) | attention 的 host 反应 | `tone:attention` 时 host **只高亮(岛/pill 发光),不再自动展开**;取消原 §7-B3 的"自动弹开" | 自动切换展开态会自行改变 UI,既打扰又使 peek/展开态无法稳定测试;高亮已足够提示有积木求关注,是否展开交给用户 |
| Q13(2026-06-03) | peek 态也可拖动重定位 | peek 态(hover 收起 pill)pill 行内显示一个**独立拖动握把**(`-webkit-app-region: drag`)移动岛;pill 保持 no-drag,点击仍只展开。复用 Q11 的 window-state 持久化 + `moved` 监听 + 锚点感知,无新机制 | 原 Q11 拖动手柄只在展开态;peek 本就因 hover 可交互,故不破收起态 click-through(真收起/非 hover 仍穿透、不显握把)。独立握把避开"同一区域既点击展开又拖动"的冲突:Windows 上 drag region 会吞点击,故拆成握把(drag)+ pill(no-drag 可点) |
| Q14(2026-06-03) | peek 拖动的交互方式(修正 Q13) | 弃用 Q13 小握把,**改为整个 peek pill 行可拖**:renderer `mousedown` 起 JS 拖动会话,经 IPC 让 main 按 OS 光标(`getCursorScreenPoint`,DIP)`setPosition` 移窗;位移超阈值(~4px)算拖动、否则算点击→展开;`drag-end` 持久化 placed 位置 | 小握把目标太小难瞄,体验差;整行可拖给大目标。不用 `-webkit-app-region: drag`(会吞单击使点击展开失效),改 JS 拖动 + 阈值,单击展开与拖动两不误。移窗用 main 端光标 DIP 坐标(renderer 坐标只判阈值);拖动期 `setPosition` 是 programmatic,`drag-end` 显式持久化。Q11 锚点感知不变 |
| Q16(2026-06-06 · **契约变更**) | 放宽 host 契约以支持「岛内自托管 + 配置」brick(取 ①②,推迟 ③) | **① host 托管本地 brick**:启用 manifest 早已预留的 `launch`(Q2),host 发现 manifest 后若声明 `launch` 则 spawn 本地进程、退出时 kill;不破协议帧。**② 岛内通用配置**:manifest 新增 capabilities 字段 `config?: { key, label, type ∈ string\|number\|secret, default? }[]`,brick 声明所需配置项,host 渲染**域无知**表单(仅按 `type` 渲染,`secret`→密码框),值存 `~/.island/plugins/<id>/config.json`(不进 layout config)、spawn 时作环境变量 `ISLE_CFG_<KEY>` 注入,不新增运行时帧。**③ 公开 package 下载/marketplace 仍不做**,只托管本地/自写 package。**immutable 原则细化**:signal/action 数据帧仍 immutable;manifest=capabilities 可经正式 dev-constraint 决策向后兼容扩展(保持 MCP-shaped) | (c) 真实诉求是"无需外部手动起程序 + 岛内配 key/频率"的 onboarding 体验,①② 即满足且不破 host 域无知(① 早有预留、② 仅加一个域无知 capabilities 字段);③ 是分发问题、独占一套安全模型(下载并 spawn 完整权限进程,攻击面远大于 view sandbox),故分期 |
| Q17(2026-06-06 · feature) | v0.2.0 (a):prices 下游积木实现规格 | 数据源 yfinance;映射 `metrics`(tone ∈ up/down/flat);key/刷新频率读环境变量 `ISLE_CFG_YFINANCEKEY` / `ISLE_CFG_REFRESHMS`(经 Q16 ② 注入);brick 自取自推,host 不变(域无知,只收 metrics)。依赖 Q16 ①② host 实现先就位才能端到端 | prices 最好测、先行验证真实数据流;领域逻辑全在 brick,host 域无知不破;读 env 取配置贴 `ISLE_CFG_*` 约定 |
| Q18(2026-06-06 · feature) | v0.2.0 (b):展开态数据块尺寸/形状可调 | 展开态每块卡片右下角拖拽手柄自由调宽/高,尺寸持久化到 `~/.island/window-state.json`(运行时状态,不写回声明式 layout config);不碰 render kind 词表/协议帧/域无知 | 与 Q11 一致:尺寸是窗口状态而非 layout,走独立 state 文件、程序可写,不污染手写 config;调尺寸不涉业务含义 |

---

## Appendix B — 协议帧补充示例

```jsonc
// view kind:积木推一段沙箱 HTML + 控件(壁纸缩略图 + 换一张)
{ "kind": "view",
  "data": { "html": "<img src='http://localhost:7815/thumb.png'/>",
            "controls": [ { "label": "换一张", "action": "shuffle" } ] } }
```
