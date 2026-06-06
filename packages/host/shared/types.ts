// Host-internal types shared across main / preload / renderer. NOT protocol frames. / 跨 main/preload/renderer 的宿主内部类型,非协议帧
// (Type-only file — fully erased at build time, safe to import from any context.) / 纯类型文件,构建期擦除,任意上下文可引入
import type { ConnState, Manifest, Signal } from '@isle/protocol';

// The host's normalized view of one brick: its manifest, live connection state, and last-known signal. / 宿主对单个 brick 的归一化视图:manifest、连接态、last-known signal
export interface BrickView {
  manifest: Manifest;
  connState: ConnState;
  // Last validated signal, or null before the first frame arrives. / 最近一次校验通过的 signal,首帧前为 null
  lastSignal: Signal | null;
  // Epoch ms of the last signal (drives stale derivation), or null. / 最近 signal 的 epoch ms(用于推导 stale),否则 null
  lastSeenTs: number | null;
}

// An immutable snapshot of the whole bus, pushed main → renderer on every change. / 整条 bus 的不可变快照,每次变化由 main 推给 renderer
export interface BusSnapshot {
  bricks: BrickView[];
}

// A user-set expanded-card size in CSS px (Q18). / 用户设定的展开态卡片尺寸,CSS px(Q18)
export interface CardSize {
  w: number;
  h: number;
}

// A user-set expanded-card position on the canvas, CSS px relative to the panel (Q19). / 用户设定的展开态卡片在画布上的位置,相对面板的 CSS px(Q19)
export interface CardPos {
  x: number;
  y: number;
}

// Persisted island window state at ~/.island/window-state.json. NOT layout config (see DESIGN Q11). / 岛窗口状态持久化,非 layout 配置
export interface WindowState {
  // Top-left of the window (DIP). / 窗口左上角(DIP)
  x: number;
  y: number;
  // User has dragged the island → stop auto-centering, keep this position. / 用户拖过→停止自动居中,保持此位置
  placed: boolean;
  // Pinned = stay expanded + interactive (never auto-collapse, never click-through). / pin=保持展开+可交互(不自动收回、不穿透)
  pinned: boolean;
  // Per-brick expanded-card sizes the user dragged (Q18). Runtime window state, NOT layout config. / 用户拖过的每 brick 展开卡尺寸(Q18);运行时窗口状态,非 layout config
  cardSizes?: Record<string, CardSize>;
  // Per-brick expanded-card positions the user dragged on the canvas (Q19). Runtime state, NOT layout config. / 用户在画布上拖过的每 brick 卡片位置(Q19);运行时状态,非 layout config
  cardPositions?: Record<string, CardPos>;
}

// Opaque per-brick config values (Q16 ②). The host shuttles key→value, never interprets meaning. / 不透明的每 brick 配置值(Q16 ②);host 只搬运 key→value,不解读含义
export type BrickConfigValues = Record<string, string | number>;

// The typed bridge exposed on `window.isle` by the preload script. / preload 在 window.isle 上暴露的类型化桥
export interface IsleBridge {
  // Subscribe to bus snapshots; returns an unsubscribe fn. / 订阅 bus 快照,返回取消订阅函数
  onBusSnapshot: (cb: (snapshot: BusSnapshot) => void) => () => void;
  // Fire an action back to a brick. / 向 brick 回推动作
  sendAction: (brickId: string, action: string) => void;
  // Ask main to resize the island window to fit measured content. / 请求 main 将岛窗口调整到内容尺寸
  requestResize: (width: number, height: number) => void;
  // Toggle desktop click-through (collapsed = pass-through, interacting = capture). / 切换桌面穿透(收起=穿透,交互=捕获)
  setClickThrough: (passThrough: boolean) => void;
  // Tell main the user toggled pin (main persists it + drives never-collapse). / 告知 main 用户切换了 pin(main 持久化并据此不收回)
  setPinned: (pinned: boolean) => void;
  // Authoritative pin state pushed by main: initial restore, hotkey toggle, or echo of setPinned. Returns unsubscribe. / main 推送的权威 pin 态:启动恢复 / 热键 / setPinned 回声。返回取消订阅
  onPinState: (cb: (pinned: boolean) => void) => () => void;
  // Main asks the renderer to collapse (e.g. window lost focus). Returns unsubscribe. / main 要求 renderer 收回(如窗口失焦)。返回取消订阅
  onCollapse: (cb: () => void) => () => void;
  // Begin a peek-row drag session: main snapshots the window + cursor origin (Q14). / 开始 peek 整行拖动会话:main 记录窗口+光标起点(Q14)
  dragStart: () => void;
  // A drag tick: main moves the window to follow the OS cursor (DIP). / 拖动帧:main 按 OS 光标(DIP)移窗
  dragMove: () => void;
  // End the drag session: main persists the final position as a user placement. / 结束拖动:main 持久化最终位置为用户放置
  dragEnd: () => void;
  // Get a brick's saved config values to prefill its form (Q16 ②). / 取某 brick 已存配置值以预填表单(Q16 ②)
  getBrickConfig: (brickId: string) => Promise<BrickConfigValues>;
  // Save a brick's config values → main persists + respawns it with the new env (Q16 ②). / 保存某 brick 配置值→main 持久化并带新 env 重启(Q16 ②)
  setBrickConfig: (brickId: string, values: BrickConfigValues) => Promise<void>;
  // Get persisted expanded-card sizes to apply on mount (Q18). / 取已存的展开卡尺寸以在挂载时应用(Q18)
  getCardSizes: () => Promise<Record<string, CardSize>>;
  // A resize drag ended → persist this brick's card size (Q18). / 卡片 resize 拖动结束→持久化该 brick 卡尺寸(Q18)
  setCardSize: (brickId: string, w: number, h: number) => void;
  // Get persisted expanded-card positions to apply on mount (Q19). / 取已存的展开卡位置以在挂载时应用(Q19)
  getCardPositions: () => Promise<Record<string, CardPos>>;
  // A card drag ended → persist this brick's canvas position (Q19). / 卡片拖动结束→持久化该 brick 画布位置(Q19)
  setCardPosition: (brickId: string, x: number, y: number) => void;
}
