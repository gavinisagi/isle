// `view` stream: a sandboxed HTML blob + a control. Host mounts it in an iframe, never parses it. / view 流:沙箱 HTML + 控件,host 用 iframe 挂载,绝不解析
import type { Signal } from '@isle/protocol';
import { nowTs, type Preset } from '../scripted-stream.js';

const swatches = ['#0a84ff', '#34c759', '#ff453a', '#ffd60a', '#bf5af2'];
let idx = 0;

function viewSignal(): Signal {
  const color = swatches[idx % swatches.length];
  // Self-contained HTML; CSP in the host only allows local-port img/connect. / 自包含 HTML;host CSP 仅放行本地端口 img/connect
  const html = `<div style="font:13px system-ui;color:#fff;padding:14px;background:${color};border-radius:10px">
    Sandbox view · 沙箱视图<br/><b>swatch #${idx}</b></div>`;
  return { kind: 'view', ts: nowTs(), data: { html, controls: [{ label: 'Shuffle', action: 'shuffle' }] } };
}

export const viewPreset: Preset = {
  manifest: {
    id: 'mock-view',
    name: 'Mock View',
    port: 7816,
    emits: ['view'],
    collapsed: { glyph: '🖼️', badge: 'view' },
    actions: ['shuffle'],
    heartbeat: 10_000,
  },
  script: {
    steps: [{ after: 0, signal: viewSignal }],
  },
  onAction: (frame, broadcast) => {
    if (frame.name === 'shuffle') idx += 1;
    broadcast(viewSignal());
  },
};
