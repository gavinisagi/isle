// Attention detection. The host reads `tone === 'attention'` (its own vocabulary) — never the brick's `state` words. / 注意力检测:host 读 tone==='attention'(自有词表),绝不读 brick 的 state 词
import type { BrickView, BusSnapshot } from '../../shared/types.js';

// A brick is "calling for attention" if its latest status signal has any attention-toned item. / 若 brick 最新 status signal 有任一 attention 词条,则其在"求关注"
export function brickHasAttention(brick: BrickView): boolean {
  const s = brick.lastSignal;
  return s?.kind === 'status' && s.data.items.some((item) => item.tone === 'attention');
}

export function snapshotHasAttention(snapshot: BusSnapshot): boolean {
  return snapshot.bricks.some(brickHasAttention);
}
