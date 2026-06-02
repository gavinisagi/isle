// `slow` brick: connects and accepts the SSE stream but NEVER pushes a signal. / slow 积木:连上并接受 SSE 流,但从不推任何 signal
// Exercises the host's "connected but silent → stale" path (derived from heartbeat, last-known preserved). / 验证 host"连上但沉默→stale"路径(据 heartbeat 推导,保留 last-known)
// A short heartbeat makes the host surface `stale` within ~heartbeat×3 instead of minutes. / 短 heartbeat 让 host 在约 heartbeat×3 内翻 stale,而非数分钟
import { type Preset } from '../scripted-stream.js';

export const slowPreset: Preset = {
  manifest: {
    id: 'mock-slow',
    name: 'Mock Slow',
    port: 7818,
    emits: ['status'], // declares status, but the script below emits nothing / 声明 status,但下方脚本不推送
    collapsed: { glyph: '🐢', badge: 'slow' },
    heartbeat: 1500,
  },
  // No steps → the brick connects but stays permanently silent. / 无步骤→连上后永久沉默
  script: { steps: [] },
};
