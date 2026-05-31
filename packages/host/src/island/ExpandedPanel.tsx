// Expanded state: one card per brick, body rendered by the render-kind dispatcher. / 展开态:每 brick 一卡,卡体由渲染词表分发器渲染
// When degraded, the last-known signal stays on screen (dimmed) — never blank, never crash. / 降级时 last-known 仍在(变暗),绝不空白、绝不崩
import type { BrickView } from '../../shared/types.js';
import { RenderKind } from '../render-kinds/RenderKind.js';
import { DisconnectedBadge } from '../components/DisconnectedBadge.js';

export function ExpandedPanel({ bricks }: { bricks: BrickView[] }): JSX.Element {
  return (
    <div className="isle-panel">
      {bricks.map((brick) => {
        const degraded = brick.connState === 'disconnected' || brick.connState === 'stale';
        return (
          <div key={brick.manifest.id} className="isle-card">
            <div className="isle-card__head">
              <span className="isle-card__glyph">{brick.manifest.collapsed.glyph}</span>
              <span className="isle-card__name">{brick.manifest.name}</span>
              <DisconnectedBadge connState={brick.connState} />
            </div>
            <div className={`isle-card__body${degraded ? ' isle-card__body--degraded' : ''}`}>
              {brick.lastSignal ? (
                <RenderKind signal={brick.lastSignal} brickId={brick.manifest.id} />
              ) : (
                <span className="isle-card__empty">
                  {brick.connState === 'connecting' ? 'connecting… / 连接中' : 'no data yet / 暂无数据'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
