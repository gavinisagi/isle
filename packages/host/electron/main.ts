// Main entry: assemble the island shell + the protocol skeleton (registry → bus → IPC). / 主入口:装配岛壳 + 协议骨架(registry→bus→IPC)
import { mkdirSync } from 'node:fs';
import { app, BrowserWindow } from 'electron';
import { createIslandWindow } from './window/island-window.js';
import { positionTopCenter, watchDisplays } from './window/positioning.js';
import { createTray } from './tray.js';
import { pushBusSnapshot, registerIpcHandlers } from './ipc/channels.js';
import { Bus } from './core/bus.js';
import { PLUGINS_DIR, scanManifests } from './core/registry.js';
import { watchPlugins } from './core/watcher.js';
import { postAction } from './core/action-client.js';
import { loadConfig } from './config/load-config.js';
import { watchConfig } from './config/config-watcher.js';
import { applyConfig } from '../shared/config.js';
import type { IsleConfig } from '../shared/config.js';

// Single-instance: a second launch just exits (the first island is already up). / 单实例:二次启动直接退出
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let tray: Electron.Tray | null = null;
let bus: Bus | null = null;
let unwatch: (() => void) | null = null;
let unwatchConfig: (() => void) | null = null;
let currentConfig: IsleConfig | null = null;

function bootstrap(): void {
  const win = createIslandWindow();
  win.setIgnoreMouseEvents(true, { forward: true }); // start collapsed = click-through / 起始收起=穿透

  // Apply layout config on the way out to the renderer (presentation-only). / 出口处应用布局配置(仅展示)
  const pushSnapshot = (): void => {
    if (bus) pushBusSnapshot(win, applyConfig(bus.snapshot(), currentConfig));
  };

  // --- protocol skeleton / 协议骨架 ---
  mkdirSync(PLUGINS_DIR, { recursive: true }); // ensure the registry dir exists to watch / 确保注册目录存在以监听
  bus = new Bus();
  bus.onSnapshot(() => pushSnapshot());

  // discover already-registered bricks, then watch for live add/remove. / 先发现已注册 brick,再监听增删
  for (const manifest of scanManifests()) bus.upsertManifest(manifest);
  unwatch = watchPlugins({
    onUpsert: (m) => bus?.upsertManifest(m),
    onRemove: (id) => bus?.removeManifest(id),
  });
  bus.startStaleTimer();

  // --- layout config + hot reload / 布局配置 + 热重载 ---
  const reloadConfig = (): void => {
    loadConfig()
      .then((cfg) => {
        currentConfig = cfg; // null = no/absent config (identity layout) / null=无配置(原样布局)
        pushSnapshot();
      })
      .catch((err: unknown) => {
        // Parse error → keep the last good config, never crash. / 解析错误→保留上一份有效配置,绝不崩
        console.error('[config] reload failed, keeping last good / 重载失败,保留上一份', err);
      });
  };
  reloadConfig();
  unwatchConfig = watchConfig(reloadConfig);

  // control press → action back to the owning brick. / 控件按下→动作回推所属 brick
  registerIpcHandlers(win, {
    onAction: (brickId, action) => {
      const manifest = bus?.getManifest(brickId);
      if (manifest) postAction(manifest.port, { name: action });
    },
  });

  watchDisplays(win);

  win.once('ready-to-show', () => {
    positionTopCenter(win);
    win.showInactive(); // show without stealing focus / 显示但不抢焦点
  });

  // Renderer mounts after main has already emitted snapshots — push the current one on load. / renderer 挂载晚于 main 首次发快照,加载完成时补推当前快照
  win.webContents.on('did-finish-load', () => pushSnapshot());

  tray = createTray(win);
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  // Tray app: stay resident when the window is hidden. / 托盘应用:窗口隐藏仍驻留
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) bootstrap();
});

app.on('before-quit', () => {
  unwatch?.();
  unwatchConfig?.();
  bus?.stop();
});
