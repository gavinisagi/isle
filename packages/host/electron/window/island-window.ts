// Creates the island BrowserWindow: transparent, frameless, always-on-top, click-through-capable. / 创建岛窗口:透明、无边框、置顶、可穿透
// This is the R1 "empty-shell feel" core — get this right before wiring any data. / 这是 R1 空壳手感核心,接数据前先调对
import { BrowserWindow } from 'electron';
import { join } from 'node:path';

// Collapsed pill default size; the renderer measures real content and requests resizes. / 收起 pill 默认尺寸,renderer 量真实内容后请求 resize
export const INITIAL_WIDTH = 240;
export const INITIAL_HEIGHT = 52;

export function createIslandWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: INITIAL_WIDTH,
    height: INITIAL_HEIGHT,
    // Frameless transparent floating window — a userland island, nothing native. / 无边框透明悬浮窗,纯用户态
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    // Don't show until positioned, and never steal focus when it appears. / 定位后再显示,出现时不抢焦点
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox off so the bundled preload can use Node-built bridge wiring; renderer stays isolated. / 关 sandbox 让打包的 preload 可用 Node 桥接,renderer 仍隔离
      sandbox: false,
    },
  });

  // Sit above normal windows (incl. most full-screen apps) without grabbing focus. / 浮于普通窗口之上(含多数全屏应用)且不夺焦点
  win.setAlwaysOnTop(true, 'screen-saver');
  // Visible across virtual desktops / fullscreen spaces. / 跨虚拟桌面/全屏空间可见
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Load renderer: dev server URL when present, built file otherwise. / 加载 renderer:有 dev server 用 URL,否则用构建文件
  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}
