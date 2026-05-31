// The `manifest` frame: discovery. A plugin.json dropped into ~/.island/plugins/<id>/. / manifest 帧:发现,plugin.json 丢进 ~/.island/plugins/<id>/
import type { RenderKind } from './render-kind.js';

export interface ManifestCollapsed {
  // Icon shown on the collapsed pill. / 收起态 pill 上的图标
  glyph: string;
  // Optional short badge text/key. / 可选短角标文本/键
  badge?: string;
}

export interface Manifest {
  id: string;
  name: string;
  // The local port the host connects to for SSE + actions. / host 连接以收 SSE、发 action 的本地端口
  port: number;
  // Which render kinds this brick may emit. / 本 brick 可能推送哪些渲染词表
  emits: RenderKind[];
  collapsed: ManifestCollapsed;
  // Action names the host may POST back (optional). / host 可回 POST 的动作名(可选)
  actions?: string[];
  // Expected push/heartbeat interval (ms). The host DERIVES stale from this — never hard-codes a threshold. / 预期推送/心跳间隔(ms),host 据此算 stale,不硬编码阈值
  heartbeat?: number;
  // v2 auto-spawn command; IGNORED in v1 (manual process start). / v2 自启命令,v1 忽略(手动起进程)
  launch?: string;
}
