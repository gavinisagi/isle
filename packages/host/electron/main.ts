// Main entry: assemble the island shell + the protocol skeleton (registry → bus → IPC). / 主入口:装配岛壳 + 协议骨架(registry→bus→IPC)
import { mkdirSync } from 'node:fs';
import { app, BrowserWindow, globalShortcut } from 'electron';
import { createIslandWindow } from './window/island-window.js';
import { placeWindow, watchDisplays } from './window/positioning.js';
import { wasProgrammatic } from './window/geometry.js';
import { loadWindowState, saveWindowState } from './window/window-state.js';
import { createTray } from './tray.js';
import { pushBusSnapshot, pushCollapse, pushPinState, registerIpcHandlers } from './ipc/channels.js';
import { Bus } from './core/bus.js';
import { PLUGINS_DIR, scanManifests } from './core/registry.js';
import { watchPlugins } from './core/watcher.js';
import { postAction } from './core/action-client.js';
import { loadConfig } from './config/load-config.js';
import { watchConfig } from './config/config-watcher.js';
import { applyConfig } from '../shared/config.js';
import type { IsleConfig } from '../shared/config.js';
import type { WindowState } from '../shared/types.js';

// Global hotkey to toggle pin from anywhere (island stays expanded + interactive while pinned). / 全局热键随处切换 pin(pin 时岛保持展开+可交互)
const PIN_HOTKEY = 'CommandOrControl+Alt+I';

// Single-instance: a second launch just exits (the first island is already up). / 单实例:二次启动直接退出
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let tray: Electron.Tray | null = null;
let bus: Bus | null = null;
let unwatch: (() => void) | null = null;
let unwatchConfig: (() => void) | null = null;
let currentConfig: IsleConfig | null = null;
// Persisted window position + pin; defaults until a saved state is loaded. / 持久化的窗口位置+pin,加载前用默认
let winState: WindowState = { x: 0, y: 0, placed: false, pinned: false };

function bootstrap(): void {
  // Restore saved position + pin (null when absent → defaults already set). / 恢复已存位置+pin(无则用默认)
  const saved = loadWindowState();
  if (saved) winState = saved;

  const win = createIslandWindow();
  win.setIgnoreMouseEvents(true, { forward: true }); // start collapsed = click-through / 起始收起=穿透

  // Lost focus (e.g. user clicked another app) → collapse, unless pinned. Reliable where a focused / 失焦(如点了别的 app)→ 收回,除非已 pin。聚焦的透明窗口
  // transparent window's DOM mouse-leave isn't. The collapsed pill never holds focus, so this only / DOM mouseleave 不可靠时,这是可靠信号;收起 pill 从不持焦,故仅在
  // fires after the user actually clicked (focused) the expanded island. / 用户真正点过(聚焦了)展开的岛后才触发
  win.on('blur', () => {
    if (!win.isDestroyed() && !winState.pinned) pushCollapse(win);
  });

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

  // Main owns pin: persist + echo the authoritative state to the renderer. / main 持有 pin:持久化并向 renderer 回推权威态
  const applyPinned = (pinned: boolean): void => {
    winState = { ...winState, pinned };
    saveWindowState(winState);
    pushPinState(win, pinned);
  };

  // control press → action; resize anchored on the dragged position; pin button → applyPinned. / 控件按下→动作;resize 锚定拖动位;pin 按钮→applyPinned
  registerIpcHandlers(win, {
    onAction: (brickId, action) => {
      const manifest = bus?.getManifest(brickId);
      if (manifest) postAction(manifest.port, { name: action });
    },
    placedAnchor: () => (winState.placed ? { x: winState.x, y: winState.y } : null),
    onSetPinned: applyPinned,
  });

  // Global hotkey toggles pin from anywhere. Re-register cleanly in case bootstrap re-runs. / 全局热键随处切换 pin,bootstrap 重跑则干净重注册
  globalShortcut.unregister(PIN_HOTKEY);
  if (!globalShortcut.register(PIN_HOTKEY, () => applyPinned(!winState.pinned))) {
    console.error(`[hotkey] failed to register ${PIN_HOTKEY} (already taken?) / 注册失败,可能被占用`);
  }

  watchDisplays(win, { isPlaced: () => winState.placed });

  win.once('ready-to-show', () => {
    placeWindow(win, winState.placed ? { x: winState.x, y: winState.y } : null);
    win.showInactive(); // show without stealing focus / 显示但不抢焦点

    // Placed now → a move we DIDN'T initiate (position ≠ our last programmatic set) is a user drag → persist. / 已定位后,非我们发起的移动(位置≠最后程序设置)即用户拖动→持久化
    win.on('moved', () => {
      if (win.isDestroyed()) return;
      const b = win.getBounds();
      if (wasProgrammatic(b.x, b.y)) return; // our own resize / clamp / place — ignore / 自己的 resize/夹回/定位,忽略
      winState = { ...winState, x: b.x, y: b.y, placed: true };
      saveWindowState(winState);
    });
  });

  // Renderer mounts after main has already emitted snapshots — push current snapshot + restored pin on load. / renderer 挂载晚于 main 首发,加载完成时补推当前快照 + 恢复的 pin
  win.webContents.on('did-finish-load', () => {
    pushSnapshot();
    pushPinState(win, winState.pinned);
  });

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
  globalShortcut.unregisterAll();
  unwatch?.();
  unwatchConfig?.();
  bus?.stop();
  tray?.destroy();
});
