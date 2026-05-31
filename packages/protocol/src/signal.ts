// The `signal` frame: brick → host over SSE. A discriminated union over `kind`. / signal 帧:brick→host 走 SSE,按 kind 判别联合
import type { RenderKind } from './render-kind.js';
import type { MetricTone, StatusTone } from './tone.js';

// --- Per-kind item shapes the host sees (generic, domain-blind) / host 看到的各 kind 词条形状(通用、域无知) ---

export interface ListItem {
  text: string;
  // `state` is OPAQUE to the host — it never branches on its value. / state 对 host 不透明,host 绝不据其值分支
  state?: string;
  badge?: string;
}

export interface MetricItem {
  label: string;
  value: string;
  delta?: string;
  tone?: MetricTone;
}

export interface StatusItem {
  label: string;
  // Opaque to the host; the brick maps meaning → tone. / 对 host 不透明,brick 负责语义→tone
  state: string;
  tone?: StatusTone;
  detail?: string;
}

export interface TextBlock {
  text: string;
}

export interface Control {
  label: string;
  // Name of an action the host POSTs back to the brick. / host 回 POST 给 brick 的动作名
  action: string;
}

// --- The discriminated union: kind selects the data shape / 判别联合:kind 决定 data 形状 ---

export type SignalData =
  | { kind: 'list'; data: { items: ListItem[] } }
  | { kind: 'metrics'; data: { items: MetricItem[] } }
  | { kind: 'status'; data: { items: StatusItem[] } }
  | { kind: 'text'; data: { blocks: TextBlock[] } | { text: string } }
  | { kind: 'control'; data: { controls: Control[] } }
  | { kind: 'view'; data: { html: string; controls?: Control[] } };

// A full signal frame = the discriminated payload + a timestamp (epoch seconds). / 完整 signal 帧 = 判别载荷 + 时间戳(秒)
export type Signal = SignalData & { ts: number };

// Narrow a Signal to the kind that owns `data`. Lets the host `switch (sig.kind)` exhaustively. / 让 host 可对 sig.kind 穷尽 switch
export type SignalOf<K extends RenderKind> = Extract<Signal, { kind: K }>;
