// Watch ~/.island/config.ts for edits → hot reload, no restart. / 监听 ~/.island/config.ts 改动→热重载,无需重启
import chokidar from 'chokidar';
import { CONFIG_PATH } from './load-config.js';

export function watchConfig(onChange: () => void): () => void {
  const watcher = chokidar.watch(CONFIG_PATH, { ignoreInitial: true });
  watcher.on('add', onChange);
  watcher.on('change', onChange);
  watcher.on('unlink', onChange); // removed → fall back to no config / 删除→回落到无配置
  return () => void watcher.close();
}
