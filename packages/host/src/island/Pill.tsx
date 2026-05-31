// Collapsed representation of one brick: its manifest glyph + optional badge. / 单个 brick 的收起表示:manifest glyph + 可选 badge
import type { BrickView } from '../../shared/types.js';
import { brickHasAttention } from './attention.js';

interface PillProps {
  brick: BrickView;
  // Show the brick name alongside the glyph (peek/expanded states). / peek/展开态时在 glyph 旁显示名称
  showLabel: boolean;
}

export function Pill({ brick, showLabel }: PillProps): JSX.Element {
  const { manifest, connState } = brick;
  const dim = connState === 'disconnected' || connState === 'stale';
  const attention = brickHasAttention(brick);
  return (
    <div className={`isle-pill${dim ? ' isle-pill--dim' : ''}${attention ? ' isle-pill--attention' : ''}`}>
      {/* glyph is opaque text (emoji or icon-font class); host doesn't interpret it / glyph 是不透明文本,host 不解读 */}
      <span className="isle-pill__glyph">{manifest.collapsed.glyph}</span>
      {manifest.collapsed.badge && <span className="isle-pill__badge">{manifest.collapsed.badge}</span>}
      {showLabel && <span className="isle-pill__label">{manifest.name}</span>}
    </div>
  );
}
