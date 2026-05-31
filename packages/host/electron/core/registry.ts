// Manifest discovery: ~/.island/plugins/<id>/plugin.json is the registry. / manifest 发现:~/.island/plugins/<id>/plugin.json 即注册中心
// All untrusted JSON passes through parseManifest — bad files are skipped, never thrown. / 所有不可信 JSON 经 parseManifest,坏文件跳过不抛
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { MANIFEST_FILENAME, parseManifest, type Manifest } from '@isle/protocol';

export const PLUGINS_DIR = join(homedir(), '.island', 'plugins');

// Read + validate the manifest in a given plugin dir, or null. / 读取并校验某插件目录的 manifest,否则 null
export function readManifestAt(dir: string): Manifest | null {
  const file = join(dir, MANIFEST_FILENAME);
  if (!existsSync(file)) return null;
  try {
    return parseManifest(JSON.parse(readFileSync(file, 'utf8')));
  } catch {
    return null; // malformed JSON → ignore / 坏 JSON 忽略
  }
}

// One-shot scan of all registered plugins at startup. / 启动时一次性扫描所有已注册插件
export function scanManifests(): Manifest[] {
  if (!existsSync(PLUGINS_DIR)) return [];
  const out: Manifest[] = [];
  for (const entry of readdirSync(PLUGINS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = readManifestAt(join(PLUGINS_DIR, entry.name));
    if (manifest) out.push(manifest);
  }
  return out;
}
