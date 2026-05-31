// Multi-monitor + per-DPI placement. Always work in DIP coords via `screen`; never assume one display. / 多屏+per-DPI 定位,一律用 screen 的 DIP 坐标,绝不假设单屏
import { BrowserWindow, screen } from 'electron';

// Gap from the top edge of the work area (DIP). / 距工作区顶边的间隙(DIP)
const TOP_MARGIN = 8;

// Center the island horizontally at the top of the primary display's work area. / 将岛水平居中置于主屏工作区顶部
// `workArea` (not `bounds`) keeps clear of the taskbar; coords are DIP so DPI scaling is handled by Electron. / 用 workArea 避开任务栏,DIP 坐标让 Electron 处理 DPI 缩放
export function positionTopCenter(win: BrowserWindow): void {
  const display = screen.getPrimaryDisplay();
  const { x, y, width } = display.workArea;
  const winWidth = win.getBounds().width;
  const targetX = Math.round(x + (width - winWidth) / 2);
  const targetY = Math.round(y + TOP_MARGIN);
  win.setPosition(targetX, targetY);
}

// Re-center on any display topology / scale change so the island never drifts or strands off-screen. / 显示拓扑/缩放变化时重新居中,避免岛漂移或跑到屏外
export function watchDisplays(win: BrowserWindow): void {
  const reposition = (): void => {
    if (!win.isDestroyed()) positionTopCenter(win);
  };
  screen.on('display-metrics-changed', reposition);
  screen.on('display-added', reposition);
  screen.on('display-removed', reposition);
}
