// User-facing host config shape. Declares LAYOUT only — order/overrides/visibility. / 面向用户的宿主配置:只声明布局——顺序/覆盖/可见性
// The host stays domain-blind: config never describes data meaning, only presentation. / host 仍域无知:配置只讲展示,不讲数据含义
import type { BrickView, BusSnapshot } from './types.js';

export interface CollapsedOverride {
  // Override the manifest's collapsed glyph/badge for personal taste. / 按个人喜好覆盖 manifest 的收起 glyph/badge
  glyph?: string;
  badge?: string;
}

export interface IsleConfig {
  // Pill order by brick id; ids not listed follow in discovery order. / 按 brick id 的 pill 顺序,未列出的按发现顺序排后
  order?: string[];
  // Per-brick collapsed overrides. / 各 brick 的收起覆盖
  overrides?: Record<string, CollapsedOverride>;
  // Brick ids to hide from the island. / 从岛上隐藏的 brick id
  hidden?: string[];
}

// Apply layout config to a snapshot before it reaches the renderer (pure, presentation-only). / 在快照抵达 renderer 前应用布局配置(纯函数,仅展示)
export function applyConfig(snapshot: BusSnapshot, config: IsleConfig | null): BusSnapshot {
  if (!config) return snapshot;
  const hidden = new Set(config.hidden ?? []);
  const order = config.order ?? [];
  const overrides = config.overrides ?? {};

  const visible = snapshot.bricks.filter((b) => !hidden.has(b.manifest.id));

  // Apply collapsed overrides (clone manifest so we never mutate bus state). / 应用收起覆盖(克隆 manifest,绝不改 bus 状态)
  const overridden: BrickView[] = visible.map((b) => {
    const ov = overrides[b.manifest.id];
    if (!ov) return b;
    return {
      ...b,
      manifest: {
        ...b.manifest,
        collapsed: {
          glyph: ov.glyph ?? b.manifest.collapsed.glyph,
          badge: ov.badge ?? b.manifest.collapsed.badge,
        },
      },
    };
  });

  // Stable sort: listed ids by their order index, the rest after in original order. / 稳定排序:列出的按 order 下标,其余按原序排后
  const rank = (id: string): number => {
    const i = order.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const sorted = overridden
    .map((b, i) => ({ b, i }))
    .sort((a, z) => rank(a.b.manifest.id) - rank(z.b.manifest.id) || a.i - z.i)
    .map((x) => x.b);

  return { bricks: sorted };
}
