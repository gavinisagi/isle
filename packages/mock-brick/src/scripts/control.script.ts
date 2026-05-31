// `control` stream + action round-trip: host button press → POST /action → brick re-emits. / control 流 + 动作往返:host 按钮→POST /action→brick 重推
import type { Control, Signal } from '@isle/protocol';
import { nowTs, type Preset } from '../scripted-stream.js';

// Brick-side state mutated by incoming actions. / 由收到的动作改变的 brick 侧状态
let shuffles = 0;
let paused = false;

function controls(): Control[] {
  return [
    { label: `Shuffle (${shuffles})`, action: 'shuffle' },
    { label: paused ? 'Resume' : 'Pause', action: 'toggle' },
  ];
}

const control = (): Signal => ({ kind: 'control', ts: nowTs(), data: { controls: controls() } });

export const controlPreset: Preset = {
  manifest: {
    id: 'mock-control',
    name: 'Mock Wallpaper',
    port: 7815,
    emits: ['control'],
    collapsed: { glyph: '🎛️', badge: 'ctl' },
    actions: ['shuffle', 'toggle'],
    heartbeat: 10_000,
  },
  script: {
    // Emit once; further updates are driven by actions. / 先推一次,后续由动作驱动
    steps: [{ after: 0, signal: control }],
  },
  onAction: (frame, broadcast) => {
    if (frame.name === 'shuffle') shuffles += 1;
    else if (frame.name === 'toggle') paused = !paused;
    // Re-emit so the host sees the round-trip result. / 重推,让 host 看到往返结果
    broadcast(control());
  },
};
