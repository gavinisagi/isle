// `metrics` renderer. tone ∈ up/down/flat colors the value + delta. / metrics 渲染器:tone 上色 value+delta
import type { MetricItem } from '@isle/protocol';
import { toneClass } from './tone.js';

export function MetricsView({ items }: { items: MetricItem[] }): JSX.Element {
  return (
    <div className="rk-metrics">
      {items.map((item, i) => (
        <div key={i} className="rk-metrics__row">
          <span className="rk-metrics__label">{item.label}</span>
          <span className={`rk-metrics__value ${toneClass(item.tone)}`}>{item.value}</span>
          {item.delta && <span className={`rk-metrics__delta ${toneClass(item.tone)}`}>{item.delta}</span>}
        </div>
      ))}
    </div>
  );
}
