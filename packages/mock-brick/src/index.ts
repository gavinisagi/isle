// Mock brick entry. Launches one or more scripted bricks, each self-registering its manifest. / mock 积木入口:启动一个或多个脚本化积木,各自注册 manifest
// Usage / 用法:
//   tsx src/index.ts            → all bricks / 全部积木
//   tsx src/index.ts list view  → only those ids (by kind) / 仅这些(按 kind)
//   ISLE_MOCK_CHAOS=1 tsx ...    → inject failure paths / 注入异常路径
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { MANIFEST_FILENAME } from '@isle/protocol';
import { runScript, type Preset } from './scripted-stream.js';
import { createBrickServer, type BrickServer } from './server.js';
import { scheduleConnectionDrops, scheduleOffline, type ChaosHandle } from './chaos.js';
import { listPreset } from './scripts/list.script.js';
import { metricsPreset } from './scripts/metrics.script.js';
import { statusPreset } from './scripts/status.script.js';
import { textPreset } from './scripts/text.script.js';
import { controlPreset } from './scripts/control.script.js';
import { viewPreset } from './scripts/view.script.js';
import { slowPreset } from './scripts/slow.script.js';

// keyed by render kind for friendly CLI selection / 按渲染 kind 建索引,便于 CLI 选择
const PRESETS: Record<string, Preset> = {
  list: listPreset,
  metrics: metricsPreset,
  status: statusPreset,
  text: textPreset,
  control: controlPreset,
  view: viewPreset,
};

// Drop the manifest into ~/.island/plugins/<id>/plugin.json so the host discovers it. / 把 manifest 落到 ~/.island/plugins/<id>/plugin.json 供 host 发现
function registerManifest(preset: Preset): void {
  const dir = join(homedir(), '.island', 'plugins', preset.manifest.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, MANIFEST_FILENAME), JSON.stringify(preset.manifest, null, 2));
}

function main(): void {
  const selected = process.argv.slice(2);
  const presets = (selected.length ? selected : Object.keys(PRESETS))
    .map((k) => PRESETS[k])
    .filter((p): p is Preset => Boolean(p));

  const chaosOn = process.env['ISLE_MOCK_CHAOS'] === '1';
  const servers: BrickServer[] = [];
  const cancels: Array<() => void> = [];
  const chaos: ChaosHandle[] = [];

  for (const preset of presets) {
    registerManifest(preset);

    // const is fine: the onAction closure reads `server` only when invoked later. / const 即可:onAction 闭包仅在稍后被调用时读 server
    const server: BrickServer = createBrickServer({
      port: preset.manifest.port,
      onAction: (frame) => {
        console.log(`[${preset.manifest.id}] action: ${frame.name} / 收到动作`);
        preset.onAction?.(frame, server.broadcast);
      },
    });
    servers.push(server);
    cancels.push(runScript(preset.script, server.broadcast));

    console.log(`▶ ${preset.manifest.id} (${preset.manifest.emits.join(',')}) on :${preset.manifest.port}`);

    if (chaosOn) {
      // Drop connections every 12s on every brick; take the text brick offline at 25s. / 每 12s 断每个 brick;25s 让 text brick 下线
      chaos.push(scheduleConnectionDrops(server, 12_000));
      if (preset.manifest.id === 'mock-text') chaos.push(scheduleOffline(server, 25_000, preset.manifest.id));
    }
  }

  if (chaosOn) {
    // Slow brick: connects but never pushes → host must derive `stale` from heartbeat. / slow 积木:连上但永不推送→host 必须据 heartbeat 推 stale
    // Deliberately NOT subjected to connection-drops so it stays connected-and-silent. / 故意不注入断连,让它保持"连着且沉默"
    registerManifest(slowPreset);
    const slowServer = createBrickServer({ port: slowPreset.manifest.port });
    servers.push(slowServer);
    cancels.push(runScript(slowPreset.script, slowServer.broadcast));
    console.log(`▶ ${slowPreset.manifest.id} (silent, heartbeat ${slowPreset.manifest.heartbeat}ms → stale) on :${slowPreset.manifest.port}`);
    console.log('[chaos] enabled / 已启用');
  }

  const shutdown = (): void => {
    for (const c of cancels) c();
    for (const h of chaos) h.stop();
    for (const s of servers) s.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
