// `metrics` stream: values + tones drift over time (quote-like). / metrics 流:数值与 tone 随时间变动(类行情)
import type { MetricItem, MetricTone, Signal } from '@isle/protocol';
import { nowTs, type Preset } from '../scripted-stream.js';

// Mutable base prices so each emission nudges them (random walk). / 可变基价,每次推送做随机游走
const prices: Record<string, number> = { TSLA: 248.5, NVDA: 138.2, BTC: 67000 };

function tick(): MetricItem[] {
  return Object.entries(prices).map(([label, prev]) => {
    const drift = (Math.random() - 0.5) * (prev * 0.01); // ±0.5% / ±0.5%
    const next = prev + drift;
    prices[label] = next;
    const pct = (drift / prev) * 100;
    const tone: MetricTone = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
    return {
      label,
      value: next.toFixed(label === 'BTC' ? 0 : 2),
      delta: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
      tone,
    };
  });
}

const metrics = (): Signal => ({ kind: 'metrics', ts: nowTs(), data: { items: tick() } });

export const metricsPreset: Preset = {
  manifest: {
    id: 'mock-metrics',
    name: 'Mock Prices',
    port: 7812,
    emits: ['metrics'],
    collapsed: { glyph: '📈', badge: 'pnl' },
    heartbeat: 2000,
  },
  script: {
    loop: true,
    // Re-evaluated each loop via the thunk, so values keep moving. / 每轮经 thunk 重新求值,数值持续移动
    steps: [
      { after: 0, signal: metrics },
      { after: 2000, signal: metrics },
      { after: 2000, signal: metrics },
    ],
  },
};
