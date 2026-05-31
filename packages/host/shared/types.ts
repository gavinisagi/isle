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
}
