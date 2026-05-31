// `text` stream: alternates the { blocks } and { text } shapes (daily-report-like). / text 流:在 { blocks } 与 { text } 两种形状间交替(类日报)
import type { Signal } from '@isle/protocol';
import { nowTs, type Preset } from '../scripted-stream.js';

export const textPreset: Preset = {
  manifest: {
    id: 'mock-text',
    name: 'Mock Report',
    port: 7814,
    emits: ['text'],
    collapsed: { glyph: '📄', badge: 'rpt' },
    heartbeat: 5000,
  },
  script: {
    loop: true,
    steps: [
      {
        after: 0,
        signal: {
          kind: 'text',
          ts: nowTs(),
          data: { blocks: [{ text: 'Daily report' }, { text: '3 PRs merged, 1 deploy.' }] },
        } satisfies Signal,
      },
      {
        after: 5000,
        // the simpler { text } shape / 更简单的 { text } 形状
        signal: { kind: 'text', ts: nowTs(), data: { text: 'All systems nominal · 一切正常' } } satisfies Signal,
      },
    ],
  },
};
