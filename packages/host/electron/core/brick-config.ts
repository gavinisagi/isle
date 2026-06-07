// Per-brick config VALUES the host persists + injects (Q16 ②). NOT layout config (~/.island/config.ts). / 每 brick 的配置值,host 持久化+注入(Q16 ②);非 layout config
// Stored at ~/.island/plugins/<id>/config.json; injected into the spawned brick as ISLE_CFG_<KEY> env. / 存于 ~/.island/plugins/<id>/config.json,作 ISLE_CFG_<KEY> env 注入被 spawn 的 brick
// The host stays domain-blind: it shuttles opaque key→value, never interpreting meaning. / host 保持域无知:只搬运不透明的 key→value,从不解读含义
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrickConfigValues } from '../../shared/types.js';
import { PLUGINS_DIR } from './registry.js';

const CONFIG_FILENAME = 'config.json';

function configPath(id: string): string {
  return join(PLUGINS_DIR, id, CONFIG_FILENAME);
}

// Load saved values for a brick, or {} when absent/malformed (never throws). / 读某 brick 已存值,缺省/损坏返回 {}(绝不抛)
export function loadBrickConfig(id: string): BrickConfigValues {
  const file = configPath(id);
  if (!existsSync(file)) return {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: BrickConfigValues = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' || typeof v === 'number') out[k] = v;
    }
    return out;
  } catch {
    return {}; // malformed JSON → ignore, treat as no config / 坏 JSON 忽略,当作无配置
  }
}

// Persist values for a brick (the plugin dir already exists — its manifest lives there). / 持久化某 brick 的值(插件目录已存在,manifest 就在那)
export function saveBrickConfig(id: string, values: BrickConfigValues): void {
  writeFileSync(configPath(id), JSON.stringify(values, null, 2), 'utf8');
}

// Map config values to the ISLE_CFG_<KEY> env the brick reads on startup. / 把配置值映射成 brick 启动时读的 ISLE_CFG_<KEY> env
export function toEnv(values: BrickConfigValues): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) env[`ISLE_CFG_${k.toUpperCase()}`] = String(v);
  return env;
}
