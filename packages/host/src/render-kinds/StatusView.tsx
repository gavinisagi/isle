// `status` renderer. A tone-colored dot + label; `state`/`detail` are opaque display strings. / status 渲染器:tone 着色圆点+label;state/detail 为不透明展示串
import type { StatusItem } from '@isle/protocol';
import { toneClass } from './tone.js';

export function StatusView({ items }: { items: StatusItem[] }): JSX.Element {
  return (
    <div className="rk-status">
      {items.map((item, i) => (
        <div key={i} className="rk-status__row">
          <span className={`rk-status__dot ${toneClass(item.tone)}`} aria-hidden />
          <span className="rk-status__label">{item.label}</span>
          {/* state shown verbatim — host attaches no meaning to it / state 原样显示,host 不赋含义 */}
          <span className="rk-status__state">{item.state}</span>
          {item.detail && <span className="rk-status__detail">{item.detail}</span>}
        </div>
      ))}
    </div>
  );
}
