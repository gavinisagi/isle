// `list` stream: items add/remove over time (todo-like). / list 流:词条随时间增删(类待办)
import type { ListItem, Signal } from '@isle/protocol';
import { nowTs, type Preset } from '../scripted-stream.js';

const list = (items: ListItem[]): Signal => ({ kind: 'list', ts: nowTs(), data: { items } });

export const listPreset: Preset = {
  manifest: {
    id: 'mock-list',
    name: 'Mock Todo',
    port: 7811,
    emits: ['list'],
    collapsed: { glyph: '📝', badge: 'todo' },
    heartbeat: 3000,
  },
  script: {
    loop: true,
    steps: [
      // Phase A: a fuller list / A 段:较满的列表
      {
        after: 0,
        signal: list([{ text: 'Draft PRD', state: 'done' }, { text: 'Wire SSE ingest' }, { text: 'Tune the spring' }]),
      },
      // add an item / 增一项
      {
        after: 3000,
        signal: list([
          { text: 'Wire SSE ingest' },
          { text: 'Tune the spring' },
          { text: 'Ship mock brick', badge: 'new' },
        ]),
      },
      // remove an item / 删一项
      { after: 3000, signal: list([{ text: 'Tune the spring' }, { text: 'Ship mock brick', badge: 'new' }]) },
      // Phase B: nearly empty / B 段:近空
      { after: 3000, signal: list([{ text: 'Tune the spring', state: 'done' }]) },
    ],
  },
};
