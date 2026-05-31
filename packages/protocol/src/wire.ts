// Wire-level constants shared by host and bricks. / host 与 brick 共享的传输层常量

// HTTP routes every brick exposes on its port. / 每个 brick 在其端口上暴露的 HTTP 路由
export const SSE_PATH = '/events'; // GET, long-lived SSE stream (brick → host) / GET,SSE 长流
export const ACTION_PATH = '/action'; // POST { name } (host → brick) / POST 动作

// Filename the host scans for under ~/.island/plugins/<id>/. / host 在 ~/.island/plugins/<id>/ 下扫描的文件名
export const MANIFEST_FILENAME = 'plugin.json';

// SSE event name carrying a Signal payload (event: signal\ndata: <json>). / 携带 Signal 的 SSE 事件名
export const SSE_SIGNAL_EVENT = 'signal';

// Host-side connection lifecycle for a brick (not part of any frame, but shared vocabulary). / brick 的 host 侧连接生命周期(不属帧,但属共享词表)
export const CONN_STATES = ['discovered', 'connecting', 'connected', 'disconnected', 'stale'] as const;
export type ConnState = (typeof CONN_STATES)[number];

// Stale derivation defaults — used ONLY when a manifest omits `heartbeat`. / stale 推导默认值,仅当 manifest 缺省 heartbeat 时使用
// Conservative: assume a brick is healthy unless silent for well over its expected cadence. / 保守:除非沉默远超预期节奏,否则视为健康
export const DEFAULT_HEARTBEAT_MS = 60_000; // assumed cadence when unspecified / 未声明时的假定节奏
export const STALE_FACTOR = 3; // stale when now - lastSeen > heartbeat * factor / 超过 heartbeat×系数 即判 stale

// Derive staleness from the manifest-declared heartbeat (NOT a host-hard-coded threshold). / 据 manifest 声明的 heartbeat 推导 stale(非 host 硬编码阈值)
// `heartbeat` is the brick's declared cadence (ms); pass undefined to use the conservative default. / heartbeat 为 brick 声明的节奏(ms),缺省传 undefined 用保守默认
export function isStale(lastSeenMs: number, heartbeat: number | undefined, nowMs: number): boolean {
  const cadence = heartbeat && heartbeat > 0 ? heartbeat : DEFAULT_HEARTBEAT_MS;
  return nowMs - lastSeenMs > cadence * STALE_FACTOR;
}
