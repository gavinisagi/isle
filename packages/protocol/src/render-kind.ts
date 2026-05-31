// The locked render-kind vocabulary (6). The host has a built-in renderer per kind. / 已锁的渲染词表(6 个),host 每个 kind 内置一个渲染器
// Vocabulary is CLOSED: new domains route through `view`, never a new first-class kind. / 词表关闭:新领域走 view,绝不新增一等公民 kind
export const RENDER_KINDS = ['list', 'metrics', 'status', 'text', 'control', 'view'] as const;
export type RenderKind = (typeof RENDER_KINDS)[number];

export function isRenderKind(k: unknown): k is RenderKind {
  return typeof k === 'string' && (RENDER_KINDS as readonly string[]).includes(k);
}
