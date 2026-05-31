// Apply renderer-measured content size to the window, staying top-anchored and horizontally centered. / 把 renderer 量得的内容尺寸应用到窗口,保持顶部锚定、水平居中
// The window is the OUTER bound; Framer Motion animates content inside — we only snap the bound to fit. / 窗口是外层边界,Framer Motion 在内部做动画,这里只把边界贴合内容
import { BrowserWindow, screen } from 'electron';

const TOP_MARGIN = 8;
// Clamp to sane bounds so a bad measurement can't blow up the window. / 夹到合理范围,坏测量不致撑爆窗口
const MIN_W = 80;
const MIN_H = 36;
const MAX_W = 1200;
const MAX_H = 900;

export function applyResize(win: BrowserWindow, width: number, height: number): void {
  if (win.isDestroyed()) return;
  const w = Math.round(Math.max(MIN_W, Math.min(MAX_W, width)));
  const h = Math.round(Math.max(MIN_H, Math.min(MAX_H, height)));

  // Re-derive top-center for the current primary display (DIP). / 按当前主屏重算顶部居中(DIP)
  const { x, y, width: areaW } = screen.getPrimaryDisplay().workArea;
  const targetX = Math.round(x + (areaW - w) / 2);
  const targetY = Math.round(y + TOP_MARGIN);

  // Set bounds in one call to avoid a position→size flicker. / 一次性设 bounds,避免位置→尺寸两步抖动
  win.setBounds({ x: targetX, y: targetY, width: w, height: h });
}
