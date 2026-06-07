// Expanded state: a free CANVAS of cards (Q19) — each brick is absolutely positioned and draggable. / 展开态:卡片自由画布(Q19)——每 brick 绝对定位、可拖动
// Body rendered by the render-kind dispatcher; degraded shows last-known (dimmed), never blank/crash. / 卡体由渲染词表分发器渲染;降级显示 last-known(变暗),绝不空白/崩
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { BrickView, CardPos, CardSize } from '../../shared/types.js';
import { RenderKind } from '../render-kinds/RenderKind.js';
import { DisconnectedBadge } from '../components/DisconnectedBadge.js';
import { BrickConfigForm } from './BrickConfigForm.js';

// Floor so a card can't be dragged to nothing (Q18). / 下限,避免卡片被拖没(Q18)
const MIN_CARD_W = 160;
const MIN_CARD_H = 72;
// Default width for a card the user hasn't resized (absolute boxes need a width). / 用户未调过的卡片默认宽(absolute 盒需要宽度)
const DEFAULT_CARD_W = 248;
// Default vertical stacking for un-placed cards (Q19) — looks like the old flow until dragged. / 未定位卡片默认纵向堆叠(Q19),拖动前类似旧的流式
const DEFAULT_STACK_GAP = 120;
// Magnetic snap thresholds (Q20): base pull, and a stronger pull for same-size edge alignment. / 磁吸阈值(Q20):基础吸力,同尺寸边对齐用更强吸力
const SNAP = 8;
const SNAP_ALIGN = 18;

// Magnetic snap on one axis (Q20). Adjusts the dragged edge `lo` to the nearest alignment / 单轴磁吸(Q20):把拖动边 lo 调到最近的对齐
// (lo↔lo / hi↔hi) or abutment (lo↔other.hi / hi↔other.lo) within threshold; same-size edges / (lo↔lo / hi↔hi)或贴合(lo↔他 hi / hi↔他 lo);同尺寸边
// pull harder so equal cards line up into tidy rows/columns. The canvas edge (0) also attracts. / 吸力更强,使等尺寸卡排成整齐行/列;画布边缘(0)亦吸附
function snapAxis(lo: number, size: number, others: ReadonlyArray<{ lo: number; size: number }>): number {
  const hi = lo + size;
  let best = 0;
  let bestDist = Infinity;
  const consider = (delta: number, threshold: number): void => {
    const d = Math.abs(delta);
    if (d <= threshold && d < bestDist) {
      bestDist = d;
      best = delta;
    }
  };
  consider(-lo, SNAP); // align to the canvas edge (0) / 对齐画布边缘(0)
  for (const o of others) {
    const oHi = o.lo + o.size;
    const alignT = Math.abs(o.size - size) < 1 ? SNAP_ALIGN : SNAP; // same-size → stronger / 同尺寸→更强
    consider(o.lo - lo, alignT); // lo ↔ lo (edge align) / 同边对齐
    consider(oHi - hi, alignT); // hi ↔ hi
    consider(oHi - lo, SNAP); // lo ↔ other.hi (abut, dragging on the high side) / 贴合(在高侧)
    consider(o.lo - hi, SNAP); // hi ↔ other.lo (abut, dragging on the low side) / 贴合(在低侧)
  }
  return bestDist === Infinity ? lo : lo + best;
}

export function ExpandedPanel({ bricks }: { bricks: BrickView[] }): JSX.Element {
  // Which brick's config form is open (id), or null. / 哪个 brick 的配置表单打开(id),否则 null
  const [configuring, setConfiguring] = useState<string | null>(null);
  // User-set per-brick sizes (Q18) + positions (Q19); prefilled from persisted window state on mount. / 用户设定的每 brick 尺寸(Q18)+位置(Q19),挂载时从持久化窗口状态预填
  const [sizes, setSizes] = useState<Record<string, CardSize>>({});
  const [positions, setPositions] = useState<Record<string, CardPos>>({});
  // Canvas size = union bbox of all cards; absolute children don't size the parent, so we set it (Q19). / 画布尺寸=所有卡片并集包络框;absolute 子不撑父,故显式设(Q19)
  const [canvas, setCanvas] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    void window.isle?.getCardSizes().then(setSizes);
    void window.isle?.getCardPositions().then(setPositions);
  }, []);

  // Resolve a card's position: persisted, else a default vertical stack by index. / 解析卡片位置:已存,否则按 index 默认纵向堆叠
  const posFor = (id: string, index: number): CardPos => positions[id] ?? { x: 0, y: index * DEFAULT_STACK_GAP };

  // Measure the union bbox of every card and size the canvas so useMeasuredBounds still fits the window. / 测所有卡片并集包络框、设画布尺寸,使 useMeasuredBounds 仍贴合窗口
  useLayoutEffect(() => {
    const recompute = (): void => {
      let w = 0;
      let h = 0;
      bricks.forEach((brick, index) => {
        const el = cardRefs.current.get(brick.manifest.id);
        if (!el) return;
        const p = positions[brick.manifest.id] ?? { x: 0, y: index * DEFAULT_STACK_GAP };
        w = Math.max(w, p.x + el.offsetWidth);
        h = Math.max(h, p.y + el.offsetHeight);
      });
      setCanvas((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    recompute();
    // Content changes (signals) and card resizes reflow the canvas. / 内容变化(signal)与卡片 resize 重排画布
    const ro = new ResizeObserver(recompute);
    for (const el of cardRefs.current.values()) ro.observe(el);
    return () => ro.disconnect();
  }, [bricks, positions, sizes]);

  // Drag a card by its HEAD (Q19): the body stays interactive; ⚙ and the resize handle stop propagation. / 拖卡头移动卡片(Q19):卡体保持可交互;⚙ 与 resize 手柄阻止冒泡
  // Magnetic alignment to other cards' edges + the canvas edge, applied live (Q20). / 拖动中实时磁吸到其他卡片的边 + 画布边缘(Q20)
  const startDrag = (id: string, index: number, e: ReactMouseEvent): void => {
    e.preventDefault();
    const start = posFor(id, index);
    const startX = e.clientX;
    const startY = e.clientY;
    // Snapshot the dragged card's size + every OTHER card's box once — they don't change mid-drag. / 一次性快照被拖卡尺寸 + 其他每张卡几何——拖动中不变
    const selfEl = cardRefs.current.get(id);
    const dragW = sizes[id]?.w ?? selfEl?.offsetWidth ?? DEFAULT_CARD_W;
    const dragH = sizes[id]?.h ?? selfEl?.offsetHeight ?? 0;
    const others = bricks
      .filter((b) => b.manifest.id !== id)
      .map((b) => {
        const bid = b.manifest.id;
        const el = cardRefs.current.get(bid);
        const p = posFor(bid, bricks.indexOf(b));
        return {
          x: p.x,
          y: p.y,
          w: sizes[bid]?.w ?? el?.offsetWidth ?? DEFAULT_CARD_W,
          h: sizes[bid]?.h ?? el?.offsetHeight ?? 0,
        };
      });
    const onMove = (m: globalThis.MouseEvent): void => {
      const rawX = Math.max(0, start.x + (m.clientX - startX));
      const rawY = Math.max(0, start.y + (m.clientY - startY));
      const x = snapAxis(rawX, dragW, others.map((o) => ({ lo: o.x, size: o.w })));
      const y = snapAxis(rawY, dragH, others.map((o) => ({ lo: o.y, size: o.h })));
      setPositions((prev) => ({ ...prev, [id]: { x, y } }));
    };
    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      // Already snapped live → persist the current position once. / 已实时吸附→持久化当前位置一次
      setPositions((prev) => {
        const p = prev[id];
        if (p) window.isle?.setCardPosition(id, p.x, p.y);
        return prev;
      });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Resize via the bottom-right handle (Q18); the measured-bounds loop reflows the window to fit. / 右下角手柄 resize(Q18);内容测量循环让窗口贴合
  const startResize = (id: string, e: ReactMouseEvent): void => {
    e.preventDefault();
    e.stopPropagation(); // don't also start a card drag / 不同时触发卡片拖动
    const card = (e.currentTarget as HTMLElement).closest('.isle-card');
    if (!(card instanceof HTMLElement)) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = card.offsetWidth;
    const startH = card.offsetHeight;
    const onMove = (m: globalThis.MouseEvent): void => {
      const w = Math.max(MIN_CARD_W, startW + (m.clientX - startX));
      const h = Math.max(MIN_CARD_H, startH + (m.clientY - startY));
      setSizes((prev) => ({ ...prev, [id]: { w, h } }));
    };
    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setSizes((prev) => {
        const s = prev[id];
        if (s) window.isle?.setCardSize(id, s.w, s.h);
        return prev;
      });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div className="isle-panel" style={canvas.w ? { width: canvas.w, height: canvas.h } : undefined}>
      {bricks.map((brick, index) => {
        const id = brick.manifest.id;
        const degraded = brick.connState === 'disconnected' || brick.connState === 'stale';
        const hasConfig = (brick.manifest.config?.length ?? 0) > 0;
        const isConfiguring = configuring === id;
        const pos = posFor(id, index);
        const size = sizes[id];
        return (
          <div
            key={id}
            ref={(el) => {
              if (el) cardRefs.current.set(id, el);
              else cardRefs.current.delete(id);
            }}
            className="isle-card"
            style={{ left: pos.x, top: pos.y, width: size?.w ?? DEFAULT_CARD_W, ...(size ? { height: size.h } : {}) }}
          >
            {/* Head is the drag handle (Q19). / 卡头即拖动手柄(Q19) */}
            <div className="isle-card__head" onMouseDown={(e) => startDrag(id, index, e)}>
              <span className="isle-card__glyph">{brick.manifest.collapsed.glyph}</span>
              <span className="isle-card__name">{brick.manifest.name}</span>
              <DisconnectedBadge connState={brick.connState} />
              {hasConfig && (
                <button
                  className="isle-card__gear"
                  title="configure / 配置"
                  aria-label="configure / 配置"
                  onMouseDown={(e) => e.stopPropagation()} // a click on the gear must not start a drag / 点齿轮不触发拖动
                  onClick={() => setConfiguring(isConfiguring ? null : id)}
                >
                  ⚙
                </button>
              )}
            </div>
            {isConfiguring ? (
              <BrickConfigForm manifest={brick.manifest} onClose={() => setConfiguring(null)} />
            ) : (
              <div className={`isle-card__body${degraded ? ' isle-card__body--degraded' : ''}`}>
                {brick.lastSignal ? (
                  <RenderKind signal={brick.lastSignal} brickId={id} />
                ) : (
                  <span className="isle-card__empty">
                    {brick.connState === 'connecting' ? 'connecting… / 连接中' : 'no data yet / 暂无数据'}
                  </span>
                )}
              </div>
            )}
            {/* Bottom-right resize handle (Q18). / 右下角 resize 手柄(Q18) */}
            <div
              className="isle-card__resize"
              title="resize / 调整大小"
              aria-label="resize / 调整大小"
              onMouseDown={(e) => startResize(id, e)}
            />
          </div>
        );
      })}
    </div>
  );
}
