// Hand-written runtime validation for UNTRUSTED brick data. / 对不可信 brick 数据的手写运行时校验
// Used at the host's main-process ingest boundary: parse → null on bad → drop the frame, never crash. / 用于 host 主进程 ingest 边界:坏帧返回 null 丢弃,绝不崩
// Zero deps by design — a brick can be written in ~20 lines in any language, so the host must police the wire. / 刻意零依赖,brick 任意语言 ~20 行可写,故 host 必须看守 wire
import type { Manifest } from './manifest.js';
import type { Control, ListItem, MetricItem, Signal, StatusItem, TextBlock } from './signal.js';
import { isRenderKind } from './render-kind.js';
import { isMetricTone, isStatusTone } from './tone.js';

// --- low-level helpers / 底层辅助 ---

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

// Optional string: absent or a string. / 可选字符串:缺省或字符串
function optString(v: unknown): v is string | undefined {
  return v === undefined || typeof v === 'string';
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

// --- per-kind item validators / 各 kind 词条校验 ---

function isListItem(v: unknown): v is ListItem {
  return isObject(v) && isString(v.text) && optString(v.state) && optString(v.badge);
}

function isMetricItem(v: unknown): v is MetricItem {
  return (
    isObject(v) &&
    isString(v.label) &&
    isString(v.value) &&
    optString(v.delta) &&
    (v.tone === undefined || isMetricTone(v.tone))
  );
}

function isStatusItem(v: unknown): v is StatusItem {
  return (
    isObject(v) &&
    isString(v.label) &&
    isString(v.state) &&
    optString(v.detail) &&
    (v.tone === undefined || isStatusTone(v.tone))
  );
}

function isTextBlock(v: unknown): v is TextBlock {
  return isObject(v) && isString(v.text);
}

function isControl(v: unknown): v is Control {
  return isObject(v) && isString(v.label) && isString(v.action);
}

function arrayOf<T>(v: unknown, pred: (x: unknown) => x is T): v is T[] {
  return Array.isArray(v) && v.every(pred);
}

// Validate the `data` payload against its discriminating `kind`. / 按判别 kind 校验 data 载荷
function isValidDataForKind(kind: string, data: unknown): boolean {
  if (!isObject(data)) return false;
  switch (kind) {
    case 'list':
      return arrayOf(data.items, isListItem);
    case 'metrics':
      return arrayOf(data.items, isMetricItem);
    case 'status':
      return arrayOf(data.items, isStatusItem);
    case 'text':
      // Either { blocks: TextBlock[] } or { text: string }. / 二选一
      return arrayOf(data.blocks, isTextBlock) || isString(data.text);
    case 'control':
      return arrayOf(data.controls, isControl);
    case 'view':
      return isString(data.html) && (data.controls === undefined || arrayOf(data.controls, isControl));
    default:
      return false;
  }
}

// --- public parsers (the ingest boundary) / 公开解析器(ingest 边界) ---

// Parse an untrusted signal frame. Returns a typed Signal or null. / 解析不可信 signal 帧,返回类型化 Signal 或 null
export function parseSignal(raw: unknown): Signal | null {
  if (!isObject(raw)) return null;
  const { kind, ts, data } = raw;
  if (!isRenderKind(kind)) return null;
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return null;
  if (!isValidDataForKind(kind, data)) return null;
  // Shape verified field-by-field above; the union assertion is sound here. / 上面逐字段校验过,此处联合断言安全
  return { kind, ts, data } as Signal;
}

// Parse an untrusted manifest. Returns a typed Manifest or null. / 解析不可信 manifest,返回类型化 Manifest 或 null
export function parseManifest(raw: unknown): Manifest | null {
  if (!isObject(raw)) return null;
  const { id, name, port, emits, collapsed, actions, heartbeat, launch } = raw;

  if (!isString(id) || !isString(name)) return null;
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  // emits must be a non-empty array of known render kinds. / emits 必须是已知渲染词表的非空数组
  if (!Array.isArray(emits) || emits.length === 0 || !emits.every(isRenderKind)) return null;
  if (!isObject(collapsed) || !isString(collapsed.glyph) || !optString(collapsed.badge)) return null;
  if (actions !== undefined && !isStringArray(actions)) return null;
  if (heartbeat !== undefined && (typeof heartbeat !== 'number' || heartbeat <= 0)) return null;
  if (!optString(launch)) return null;

  const manifest: Manifest = {
    id,
    name,
    port,
    emits,
    collapsed: { glyph: collapsed.glyph, badge: collapsed.badge as string | undefined },
  };
  if (actions !== undefined) manifest.actions = actions;
  if (heartbeat !== undefined) manifest.heartbeat = heartbeat;
  if (launch !== undefined) manifest.launch = launch;
  return manifest;
}
