// Expanded state: one card per brick, body rendered by the render-kind dispatcher. / 展开态:每 brick 一卡,卡体由渲染词表分发器渲染
// When degraded, the last-known signal stays on screen (dimmed) — never blank, never crash. / 降级时 last-known 仍在(变暗),绝不空白、绝不崩
import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { BrickView, CardSize } from '../../shared/types.js';
import { RenderKind } from '../render-kinds/RenderKind.js';
import { DisconnectedBadge } from '../components/DisconnectedBadge.js';
import { BrickConfigForm } from './BrickConfigForm.js';

// Floor so a card can't be dragged to nothing (Q18). / 下限,避免卡片被拖没(Q18)
const MIN_CARD_W = 160;
const MIN_CARD_H = 72;

export function ExpandedPanel({ bricks }: { bricks: BrickView[] }): JSX.Element {
  // Which brick's config form is open (id), or null. / 哪个 brick 的配置表单打开(id),否则 null
  const [configuring, setConfiguring] = useState<string | null>(null);
  // User-set per-brick card sizes (Q18); prefilled from persisted window state on mount. / 用户设定的每 brick 卡尺寸(Q18),挂载时从持久化窗口状态预填
  const [sizes, setSizes] = useState<Record<string, CardSize>>({});
  useEffect(() => {
    void window.isle?.getCardSizes().then(setSizes);
  }, []);

  // Drag the bottom-right handle to resize a card; the measured-bounds loop reflows the window to fit. / 拖右下角手柄调整卡片;内容测量循环让窗口随之贴合
  const startResize = (id: string, e: ReactMouseEvent): void => {
    e.preventDefault();
    e.stopPropagation(); // don't bubble to the root click/expand handler / 不冒泡到 root 点击/展开
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
      // Persist the final size once, on drag end. / 拖动结束时持久化最终尺寸一次
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
    <div className="isle-panel">
      {bricks.map((brick) => {
        const degraded = brick.connState === 'disconnected' || brick.connState === 'stale';
        // Only bricks that declared config fields get a gear (Q16 ②). / 仅声明了 config 字段的 brick 显示齿轮(Q16 ②)
        const hasConfig = (brick.manifest.config?.length ?? 0) > 0;
        const isConfiguring = configuring === brick.manifest.id;
        const size = sizes[brick.manifest.id];
        return (
          <div
            key={brick.manifest.id}
            className="isle-card"
            style={size ? { width: size.w, height: size.h } : undefined}
          >
            <div className="isle-card__head">
              <span className="isle-card__glyph">{brick.manifest.collapsed.glyph}</span>
              <span className="isle-card__name">{brick.manifest.name}</span>
              <DisconnectedBadge connState={brick.connState} />
              {hasConfig && (
                <button
                  className="isle-card__gear"
                  title="configure / 配置"
                  aria-label="configure / 配置"
                  onClick={() => setConfiguring(isConfiguring ? null : brick.manifest.id)}
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
                  <RenderKind signal={brick.lastSignal} brickId={brick.manifest.id} />
                ) : (
                  <span className="isle-card__empty">
                    {brick.connState === 'connecting' ? 'connecting… / 连接中' : 'no data yet / 暂无数据'}
                  </span>
                )}
              </div>
            )}
            {/* Bottom-right resize handle (Q18): drag to set this card's size. / 右下角 resize 手柄(Q18):拖动设定该卡尺寸 */}
            <div
              className="isle-card__resize"
              title="resize / 调整大小"
              aria-label="resize / 调整大小"
              onMouseDown={(e) => startResize(brick.manifest.id, e)}
            />
          </div>
        );
      })}
    </div>
  );
}
