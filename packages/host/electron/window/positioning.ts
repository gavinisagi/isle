// Multi-monitor + per-DPI placement. Always work in DIP coords via `screen`; never assume one display. / 多屏+per-DPI 定位,一律用 screen 的 DIP 坐标,绝不假设单屏
// Anchor-aware: a user-dragged ("placed") island keeps its position; otherwise it stays top-center. / 锚点感知:用户拖过(placed)保持其位置,否则顶部居中
import { BrowserWindow, screen } from 'electron';
import { setBounds, setPosition } from './geometry.js';

// Gap from the top edge of the work area (DIP). / 距工作区顶边的间隙(DIP)
const TOP_MARGIN = 8;

// Center the island horizontally at the top of the primary display's work area. / 将岛水平居中置于主屏工作区顶部
// `workArea` (not `bounds`) keeps clear of the taskbar; coords are DIP so DPI scaling is handled by Electron. / 用 workArea 避开任务栏,DIP 坐标让 Electron 处理 DPI 缩放
export function positionTopCenter(win: BrowserWindow): void {
  const { x, y, width } = screen.getPrimaryDisplay().workArea;
  const winWidth = win.getBounds().width;
  setPosition(win, Math.round(x + (width - winWidth) / 2), Math.round(y + TOP_MARGIN));
}

// Clamp a top-left so the window stays within the work area of the display it best matches. / 把左上角夹到最匹配显示器的工作区内,避免跑到屏外
export function clampToVisible(win: BrowserWindow, x: number, y: number): { x: number; y: number } {
  const { width: w, height: h } = win.getBounds();
  const wa = screen.getDisplayMatching({ x, y, width: w, height: h }).workArea;
  return {
    x: Math.round(Math.min(Math.max(x, wa.x), wa.x + wa.width - w)),
    y: Math.round(Math.min(Math.max(y, wa.y), wa.y + wa.height - h)),
  };
}

// Initial placement: restore a saved position (clamped on-screen), else top-center. / 初始定位:有已存位置则恢复(夹回屏内),否则顶部居中
export function placeWindow(win: BrowserWindow, saved: { x: number; y: number } | null): void {
  if (saved) {
    const { x, y } = clampToVisible(win, saved.x, saved.y);
    setPosition(win, x, y);
  } else {
    positionTopCenter(win);
  }
}

// On display topology / scale change: keep a placed window on-screen (clamp), else re-center. / 显示拓扑/缩放变化时:placed 则夹回屏内,否则重新居中
export function watchDisplays(win: BrowserWindow, opts: { isPlaced: () => boolean }): void {
  const reposition = (): void => {
    if (win.isDestroyed()) return;
    if (opts.isPlaced()) {
      const b = win.getBounds();
      const { x, y } = clampToVisible(win, b.x, b.y);
      setBounds(win, { x, y, width: b.width, height: b.height });
    } else {
      positionTopCenter(win);
    }
  };
  screen.on('display-metrics-changed', reposition);
  screen.on('display-added', reposition);
  screen.on('display-removed', reposition);
}
