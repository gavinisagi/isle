// The `manifest` frame: discovery. A plugin.json dropped into ~/.island/plugins/<id>/. / manifest 帧:发现,plugin.json 丢进 ~/.island/plugins/<id>/
import type { RenderKind } from './render-kind.js';

export interface ManifestCollapsed {
  // Icon shown on the collapsed pill. / 收起态 pill 上的图标
  glyph: string;
  // Optional short badge text/key. / 可选短角标文本/键
  badge?: string;
}

// A brick-declared config field (Q16). The host renders a DOMAIN-BLIND form by `type` only — it never understands the field's business meaning. / brick 声明的配置项(Q16);host 仅按 type 域无知渲染表单,永不理解字段业务含义
export interface ManifestConfigField {
  // Stable key; the host injects the value as env `ISLE_CFG_<KEY>` (uppercased) on spawn. / 稳定键;host spawn 时把值作环境变量 ISLE_CFG_<KEY>(大写)注入
  key: string;
  // Human label for the generic form. / 通用表单上的人类可读标签
  label: string;
  // How the host renders the input — `secret` masks it. The host knows the widget, not the meaning. / host 据此渲染输入框,secret 打码;host 只认控件类型,不认含义
  type: 'string' | 'number' | 'secret';
  // Optional default prefilled into the form. / 可选默认值,预填进表单
  default?: string | number;
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
  // Config schema the host renders as a domain-blind form (Q16); values persist to ~/.island/plugins/<id>/config.json and inject as ISLE_CFG_<KEY> env on spawn. / host 域无知渲染的配置 schema(Q16),值存 config.json、spawn 时作 ISLE_CFG_<KEY> 注入
  config?: ManifestConfigField[];
  // Host-managed spawn of a LOCAL brick (Q16): spawn on discovery, kill on host exit. Public download stays out of scope. / host 托管本地 brick(Q16):发现即 spawn、host 退出即 kill;公开下载仍在范围外
  launch?: string;
}
