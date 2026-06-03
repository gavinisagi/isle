// Apply renderer-measured content size to the window. / 把 renderer 量得的内容尺寸应用到窗口
// The window is the OUTER bound; Framer Motion animates content inside — we only snap the bound to fit. / 窗口是外层边界,Framer Motion 在内部做动画,这里只把边界贴合内容
// Left-anchored growth: a widening island keeps its top-left and unfolds rightward/downward, so the / 左缘锚定:变宽的岛保持左上角、向右/下展开,
// window-resize lag can't make a peek appear-then-jump-right. Shrinking re-centers (resting pill stays / 故窗口 resize 延迟无法让 peek 先出现再右移。收缩则重居中(静止 pill 仍居中);
// centered); a user-dragged island always keeps its position. / 用户拖过的岛始终保持其位置。
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
  opts: { placedAnchor: () => { x: number; y: number } | null },
): void {
  if (win.isDestroyed()) return;
  const w = Math.round(Math.max(MIN_W, Math.min(MAX_W, width)));
  const h = Math.round(Math.max(MIN_H, Math.min(MAX_H, height)));

  // Dragged: position from the SAVED drag anchor every time, then clamp for display. Using the live / 拖过:每次都从保存的拖动锚点定位,再夹回显示。若用实时
  // (already-clamped) position would let the anchor "walk" inward across grow→clamp cycles, drifting a / (已被夹过的)位置,锚点会在 grow→clamp 循环中逐步内移,
  // right-edge island toward center. The saved anchor stays put; only the display is clamped. / 把贴右边的岛拖向中间。保存锚点不动,只夹显示
  const anchor = opts.placedAnchor();
  if (anchor) {
    setBounds(win, { x: anchor.x, y: anchor.y, width: w, height: h });
    const { x, y } = clampToVisible(win, anchor.x, anchor.y);
    if (x !== anchor.x || y !== anchor.y) setBounds(win, { x, y, width: w, height: h });
    return;
  }

  // Not dragged: grow from the fixed top-left (unfold right/down); content is left-anchored so a fixed / 未拖动:从固定左上角生长(向右/下展开);内容左对齐,左缘固定
  // left edge = zero horizontal movement. Shrinking re-centers so a resting pill stays centered. / 即零水平位移。收缩则重居中,静止 pill 仍居中
  const cur = win.getBounds();
  if (w >= cur.width) {
    setBounds(win, { x: cur.x, y: cur.y, width: w, height: h });
    const { x, y } = clampToVisible(win, cur.x, cur.y);
    if (x !== cur.x || y !== cur.y) setBounds(win, { x, y, width: w, height: h });
    return;
  }

  const { x, y, width: areaW } = screen.getPrimaryDisplay().workArea;
  setBounds(win, { x: Math.round(x + (areaW - w) / 2), y: Math.round(y + TOP_MARGIN), width: w, height: h });
}
