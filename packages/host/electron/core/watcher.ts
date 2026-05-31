// Watch the plugins dir so dropping/removing a folder reflects live (the "LEGO" feel). / 监听插件目录,丢入/移除文件夹即时反映(LEGO 体感)
// chokidar v4 has no glob support — watch the real dir and filter by filename. / chokidar v4 无 glob,监听真实目录按文件名过滤
import { basename, dirname } from 'node:path';
import chokidar from 'chokidar';
import { MANIFEST_FILENAME, type Manifest } from '@isle/protocol';
import { PLUGINS_DIR, readManifestAt } from './registry.js';

export interface WatcherCallbacks {
  onUpsert: (manifest: Manifest) => void;
  onRemove: (id: string) => void;
}

export function watchPlugins(cb: WatcherCallbacks): () => void {
  const watcher = chokidar.watch(PLUGINS_DIR, { ignoreInitial: true, depth: 2 });

  const onManifestFile = (path: string): void => {
    if (basename(path) !== MANIFEST_FILENAME) return;
    const manifest = readManifestAt(dirname(path));
    if (manifest) cb.onUpsert(manifest);
  };

  watcher.on('add', onManifestFile);
  watcher.on('change', onManifestFile);
  watcher.on('unlink', (path) => {
    if (basename(path) !== MANIFEST_FILENAME) return;
    // dir name == manifest id by convention. / 目录名按约定即 manifest id
    cb.onRemove(basename(dirname(path)));
  });

  return () => void watcher.close();
}
