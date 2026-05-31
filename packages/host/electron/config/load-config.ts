// Load the user's TS layout config at ~/.island/config.ts via esbuild transpile + dynamic import. / 经 esbuild 转译+动态 import 加载用户 TS 布局配置
// Throws on parse/validation error so the caller can keep the last good config; returns null only when absent. / 解析/校验出错则抛,调用方保留上一份有效配置;仅文件缺失才返回 null
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform } from 'esbuild';
import type { IsleConfig } from '../../shared/config.js';

export const CONFIG_PATH = join(homedir(), '.island', 'config.ts');

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

// Validate the untrusted default export into an IsleConfig (or throw). / 把不可信默认导出校验为 IsleConfig(否则抛)
function validate(raw: unknown): IsleConfig {
  if (typeof raw !== 'object' || raw === null) throw new Error('config default export must be an object / 默认导出须为对象');
  const { order, overrides, hidden } = raw as Record<string, unknown>;
  if (order !== undefined && !isStringArray(order)) throw new Error('config.order must be string[] / order 须为 string[]');
  if (hidden !== undefined && !isStringArray(hidden)) throw new Error('config.hidden must be string[] / hidden 须为 string[]');
  if (overrides !== undefined && (typeof overrides !== 'object' || overrides === null)) {
    throw new Error('config.overrides must be an object / overrides 须为对象');
  }
  return raw as IsleConfig;
}

export async function loadConfig(path = CONFIG_PATH): Promise<IsleConfig | null> {
  if (!existsSync(path)) return null; // intentionally no config / 故意无配置

  const src = readFileSync(path, 'utf8');
  const { code } = await transform(src, { loader: 'ts', format: 'esm' });

  // Unique temp filename = cache-bust, so edits re-import fresh (ESM caches by URL). / 唯一临时文件名=破缓存,改动重新 import(ESM 按 URL 缓存)
  const tmp = join(tmpdir(), `isle-config-${Date.now()}-${process.pid}.mjs`);
  writeFileSync(tmp, code);
  try {
    const mod: { default?: unknown } = await import(pathToFileURL(tmp).href);
    return validate(mod.default);
  } finally {
    rmSync(tmp, { force: true });
  }
}
