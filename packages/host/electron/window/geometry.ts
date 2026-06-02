// Single chokepoint for programmatic window geometry, so we can tell our own moves from a user drag. / 程序化窗口几何的唯一入口,用于区分"我们移动的"与"用户拖动的"
// Every place / resize / clamp goes through here; it records the resulting top-left. The 'moved' / 每次定位/缩放/夹回都走这里并记录结果左上角;
// listener then treats any move that DOESN'T match the last recorded position as a user drag. / 'moved' 监听据此:位置与最后记录不符即判为用户拖动
import type { BrowserWindow } from 'electron';

let last: { x: number; y: number } | null = null;

function remember(win: BrowserWindow): void {
  const b = win.getBounds(); // read back the actual (DPI-adjusted) position / 读回真实(经 DPI 调整)位置
  last = { x: b.x, y: b.y };
}

// Set full bounds programmatically (size + position) and record the result. / 程序化设整组 bounds 并记录结果
export function setBounds(win: BrowserWindow, bounds: { x: number; y: number; width: number; height: number }): void {
  win.setBounds(bounds);
  remember(win);
}

// Set position programmatically and record the result. / 程序化设位置并记录结果
export function setPosition(win: BrowserWindow, x: number, y: number): void {
  win.setPosition(x, y);
  remember(win);
}

// True if (x, y) equals the last position WE set → this 'moved' came from us, not the user. / 若 (x,y) 等于我们最后设的位置→此 moved 来自程序而非用户
export function wasProgrammatic(x: number, y: number): boolean {
  return last !== null && last.x === x && last.y === y;
}
