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
  opts: { isPlaced: () => boolean },
): void {
  if (win.isDestroyed()) return;
  const w = Math.round(Math.max(MIN_W, Math.min(MAX_W, width)));
  const h = Math.round(Math.max(MIN_H, Math.min(MAX_H, height)));

  // Keep the top-left and unfold right/down when growing (or when the user has dragged the island). / 变宽时(或用户拖过岛时)保持左上角、向右/下展开
  // The content is left-anchored (`#root` flex-start), so a fixed left edge = zero horizontal movement. / 内容左对齐(`#root` flex-start),左缘固定即零水平位移
  const cur = win.getBounds();
  if (opts.isPlaced() || w >= cur.width) {
    setBounds(win, { x: cur.x, y: cur.y, width: w, height: h });
    const { x, y } = clampToVisible(win, cur.x, cur.y); // getBounds() now reflects the new size / 此刻 getBounds 已是新尺寸
    if (x !== cur.x || y !== cur.y) setBounds(win, { x, y, width: w, height: h });
    return;
  }

  // Not dragged and shrinking → re-center the smaller island at top-center (resting pill returns to center). / 未拖动且收缩→把更小的岛重新顶部居中(静止 pill 回到居中)
  const { x, y, width: areaW } = screen.getPrimaryDisplay().workArea;
  setBounds(win, { x: Math.round(x + (areaW - w) / 2), y: Math.round(y + TOP_MARGIN), width: w, height: h });
}
