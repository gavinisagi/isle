// Tone is the ONLY semantic the host understands — it maps tone → color, nothing else. / tone 是 host 唯一认识的语义,只用于着色
// Bricks do all meaning→tone mapping; the host never interprets domain words. / 语义→tone 的映射全在 brick,host 永不解读业务词义

// Metric direction, used by the `metrics` render kind. / 指标方向,用于 metrics 渲染词条
export const METRIC_TONES = ['up', 'down', 'flat'] as const;
export type MetricTone = (typeof METRIC_TONES)[number];

// Status emphasis, used by the `status` render kind. / 状态强调,用于 status 渲染词条
// `attention` is the host's single pop-open/highlight trigger (a brick maps e.g. "waiting" → attention). / attention 是 host 弹开/高亮的唯一触发(brick 把如 "waiting" 映射成 attention)
export const STATUS_TONES = ['neutral', 'active', 'attention', 'error'] as const;
export type StatusTone = (typeof STATUS_TONES)[number];

// Runtime membership checks (used by guards at the ingest boundary). / 运行时成员检查(ingest 边界的 guards 使用)
export function isMetricTone(t: unknown): t is MetricTone {
  return typeof t === 'string' && (METRIC_TONES as readonly string[]).includes(t);
}

export function isStatusTone(t: unknown): t is StatusTone {
  return typeof t === 'string' && (STATUS_TONES as readonly string[]).includes(t);
}
