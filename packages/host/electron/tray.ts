// System tray: show/hide the island, toggle auto-start, quit. / 系统托盘:显隐岛、切换自启、退出
import { app, Menu, nativeImage, Tray, type BrowserWindow, type NativeImage } from 'electron';
import { isAutoStartEnabled, setAutoStart } from './autostart.js';

// Generate a 16×16 white rounded dot as a BGRA bitmap so we ship no binary icon asset. / 生成 16×16 白色圆点 BGRA 位图,免带二进制图标
function makeTrayIcon(): NativeImage {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2;
  const r = size / 2 - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inside = (x - c) ** 2 + (y - c) ** 2 <= r * r;
      const i = (y * size + x) * 4;
      // BGRA, premultiplied; white fill inside the circle, transparent outside. / BGRA 预乘,圆内白色、圆外透明
      buf[i] = 255; // B
      buf[i + 1] = 255; // G
      buf[i + 2] = 255; // R
      buf[i + 3] = inside ? 255 : 0; // A
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size });
}

export function createTray(win: BrowserWindow): Tray {
  const tray = new Tray(makeTrayIcon());
  tray.setToolTip('Isle');

  const rebuildMenu = (): void => {
    const menu = Menu.buildFromTemplate([
      {
        label: win.isVisible() ? 'Hide island / 隐藏岛' : 'Show island / 显示岛',
        click: () => {
          if (win.isVisible()) win.hide();
          else win.showInactive(); // show without stealing focus / 显示但不抢焦点
          rebuildMenu();
        },
      },
      { type: 'separator' },
      {
        label: 'Start at login / 开机自启',
        type: 'checkbox',
        checked: isAutoStartEnabled(),
        click: (item) => setAutoStart(item.checked),
      },
      { type: 'separator' },
      { label: 'Quit Isle / 退出', click: () => app.quit() },
    ]);
    tray.setContextMenu(menu);
  };

  rebuildMenu();
  // Left-click toggles visibility for quick access. / 左键点击快速显隐
  tray.on('click', () => {
    if (win.isVisible()) win.hide();
    else win.showInactive();
    rebuildMenu();
  });

  return tray;
}
