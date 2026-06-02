// Apply renderer-measured content size to the window. / 把 renderer 量得的内容尺寸应用到窗口
// The window is the OUTER bound; Framer Motion animates content inside — we only snap the bound to fit. / 窗口是外层边界,Framer Motion 在内部做动画,这里只把边界贴合内容
// Anchor-aware: a placed (user-dragged) island grows from its current top-left and is clamped on-screen; / 锚点感知:placed(用户拖过)的岛从当前左上角生长并夹回屏内;
// otherwise it stays top-anchored and horizontally centered (the default feel). / 否则保持顶部锚定、水平居中(默认手感)
import { BrowserWindow, screen } from 'electron';
import { setBounds } from './geometry.js';
import { clampToVisible } from './positioning.js';

const TOP_MARGIN = 8;
// Clamp to sane bounds so a bad measurement can't blow up the window. / 夹到合理范围,坏测量不致撑爆窗口
const MIN_W = 80;
const MIN_H = 36;
const MAX_W = 1200;
const MAX_H = 900;

export function applyResize(
  win: BrowserWindow,
  width: number,
  height: number,
  opts: { isPlaced: () => boolean },
): void {
  if (win.isDestroyed()) return;
  const w = Math.round(Math.max(MIN_W, Math.min(MAX_W, width)));
  const h = Math.round(Math.max(MIN_H, Math.min(MAX_H, height)));

  if (opts.isPlaced()) {
    // Keep the user's top-left, apply the new size, THEN clamp with that new size so growth never strands off-screen. / 保持左上角先套新尺寸,再按新尺寸夹回,生长不跑出屏
    const b = win.getBounds();
    setBounds(win, { x: b.x, y: b.y, width: w, height: h });
    const { x, y } = clampToVisible(win, b.x, b.y); // getBounds() now reflects the new size / 此刻 getBounds 已是新尺寸
    if (x !== b.x || y !== b.y) setBounds(win, { x, y, width: w, height: h });
    return;
  }

  // Default: top-center on the current primary display (DIP). / 默认:按当前主屏顶部居中(DIP)
  const { x, y, width: areaW } = screen.getPrimaryDisplay().workArea;
  setBounds(win, { x: Math.round(x + (areaW - w) / 2), y: Math.round(y + TOP_MARGIN), width: w, height: h });
}
