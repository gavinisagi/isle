// `status` stream: agent states cycle; `waiting` maps to tone:attention (host pops open). / status 流:agent 状态轮转;waiting 映射 tone:attention(host 弹开)
// Meaning→tone lives HERE in the brick — the host only ever sees `tone`. / 语义→tone 在 brick 内,host 只看 tone
import type { Signal, StatusItem } from '@isle/protocol';
import { nowTs, type Preset } from '../scripted-stream.js';

const status = (items: StatusItem[]): Signal => ({ kind: 'status', ts: nowTs(), data: { items } });

export const statusPreset: Preset = {
  manifest: {
    id: 'mock-status',
    name: 'Mock Agents',
    port: 7813,
    emits: ['status'],
    collapsed: { glyph: '🤖', badge: 'agt' },
    actions: ['refresh'],
    heartbeat: 4000,
  },
  script: {
    loop: true,
    steps: [
      // all busy / 全忙
      {
        after: 0,
        signal: status([
          { label: 'build', state: 'active', tone: 'active', detail: 'compiling' },
          { label: 'test', state: 'idle', tone: 'neutral' },
        ]),
      },
      // one goes idle / 一个空闲
      {
        after: 4000,
        signal: status([
          { label: 'build', state: 'idle', tone: 'neutral' },
          { label: 'test', state: 'active', tone: 'active', detail: 'running suite' },
        ]),
      },
      // one needs input → attention (host should pop open) / 需交互→attention(host 应弹开)
      {
        after: 4000,
        signal: status([
          { label: 'build', state: 'waiting', tone: 'attention', detail: 'approve deploy?' },
          { label: 'test', state: 'idle', tone: 'neutral' },
        ]),
      },
      // an error tone for color coverage / 错误色覆盖
      {
        after: 4000,
        signal: status([
          { label: 'build', state: 'active', tone: 'active' },
          { label: 'test', state: 'failed', tone: 'error', detail: '2 failures' },
        ]),
      },
    ],
  },
};
