// Main-side IPC: receive renderer requests, expose a snapshot pusher. / 主进程 IPC:接收 renderer 请求,暴露快照推送
import { ipcMain, screen, type BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc.js';
import type { BusSnapshot } from '../../shared/types.js';
import { applyResize } from '../window/resize.js';
import { setPosition } from '../window/geometry.js';

export interface IpcDeps {
  // Wired to the action-client in phase 2; a no-op until bricks exist. / 阶段2 接 action-client,无 brick 时为空操作
  onAction: (brickId: string, action: string) => void;
  // The saved drag anchor (top-left) if the user has dragged the island, else null (resize re-centers). / 用户拖过岛则返回保存的拖动锚点(左上角),否则 null(resize 重居中)
  placedAnchor: () => { x: number; y: number } | null;
  // User toggled pin in the UI → main persists it and echoes the authoritative state back. / 用户在 UI 切换 pin→main 持久化并回推权威态
  onSetPinned: (pinned: boolean) => void;
  // A peek-row drag session ended → persist the final window position as a user placement (Q14). / peek 整行拖动结束→持久化最终窗口位置为用户放置(Q14)
  onDragEnd: () => void;
}

export function registerIpcHandlers(win: BrowserWindow, deps: IpcDeps): void {
  // renderer measured content → snap the window bound to fit (anchor-aware: top-center, or keep dragged pos). / renderer 量得内容→窗口边界贴合(锚点感知:顶部居中或保持拖动位)
  ipcMain.on(IPC.REQUEST_RESIZE, (_e, width: unknown, height: unknown) => {
    if (typeof width === 'number' && typeof height === 'number') {
      applyResize(win, width, height, { placedAnchor: deps.placedAnchor });
    }
  });

  // collapsed → pass-through (forward moves so renderer can re-arm on hover); interacting → capture. / 收起→穿透(转发 move 以便 hover 重新激活);交互→捕获
  ipcMain.on(IPC.SET_CLICK_THROUGH, (_e, passThrough: unknown) => {
    win.setIgnoreMouseEvents(Boolean(passThrough), { forward: true });
  });

  // renderer control press → action back to the owning brick. / renderer 控件按下→动作回推给所属 brick
  ipcMain.on(IPC.SEND_ACTION, (_e, brickId: unknown, action: unknown) => {
    if (typeof brickId === 'string' && typeof action === 'string') deps.onAction(brickId, action);
  });

  // renderer pin button → main owns/persists pin and echoes PIN_STATE back. / renderer pin 按钮→main 持有/持久化 pin 并回推 PIN_STATE
  ipcMain.on(IPC.SET_PINNED, (_e, pinned: unknown) => {
    deps.onSetPinned(Boolean(pinned));
  });

  // Peek-row JS drag (Q14): track the OS cursor in DIP so the whole row drags without -webkit-app-region / peek 整行 JS 拖动(Q14):按 DIP 跟踪 OS 光标,整行可拖且不用 -webkit-app-region
  // (which would swallow the click that expands). Each move is programmatic → the 'moved' listener skips / (否则会吞掉展开用的点击)。每次移动都是 programmatic→'moved' 监听跳过,
  // it; DRAG_END persists exactly once. Cursor is read main-side (authoritative DIP), unaffected by which / DRAG_END 落且仅落一次持久化。光标在 main 端读(权威 DIP),不受窗口
  // monitor/scale the moving window crosses. / 拖动跨越的显示器/缩放影响
  let dragOrigin: { winX: number; winY: number; curX: number; curY: number } | null = null;
  ipcMain.on(IPC.DRAG_START, () => {
    const b = win.getBounds();
    const c = screen.getCursorScreenPoint();
    dragOrigin = { winX: b.x, winY: b.y, curX: c.x, curY: c.y };
  });
  ipcMain.on(IPC.DRAG_MOVE, () => {
    if (!dragOrigin) return;
    const c = screen.getCursorScreenPoint();
    setPosition(win, dragOrigin.winX + (c.x - dragOrigin.curX), dragOrigin.winY + (c.y - dragOrigin.curY));
  });
  ipcMain.on(IPC.DRAG_END, () => {
    if (!dragOrigin) return;
    dragOrigin = null;
    deps.onDragEnd();
  });
}

// Push a fresh bus snapshot to the renderer. / 向 renderer 推送最新 bus 快照
export function pushBusSnapshot(win: BrowserWindow, snapshot: BusSnapshot): void {
  if (!win.isDestroyed()) win.webContents.send(IPC.BUS_SNAPSHOT, snapshot);
}

// Push the authoritative pin state to the renderer (initial restore / hotkey / echo). / 向 renderer 推送权威 pin 态(启动恢复/热键/回声)
export function pushPinState(win: BrowserWindow, pinned: boolean): void {
  if (!win.isDestroyed()) win.webContents.send(IPC.PIN_STATE, pinned);
}

// Ask the renderer to collapse now (reliable signal where DOM mouse-leave isn't, e.g. on blur). / 要求 renderer 立即收回(DOM mouseleave 不可靠时的可靠信号,如失焦)
export function pushCollapse(win: BrowserWindow): void {
  if (!win.isDestroyed()) win.webContents.send(IPC.COLLAPSE);
}
