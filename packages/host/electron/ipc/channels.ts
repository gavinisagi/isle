// Main-side IPC: receive renderer requests, expose a snapshot pusher. / 主进程 IPC:接收 renderer 请求,暴露快照推送
import { ipcMain, type BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc.js';
import type { BusSnapshot } from '../../shared/types.js';
import { applyResize } from '../window/resize.js';

export interface IpcDeps {
  // Wired to the action-client in phase 2; a no-op until bricks exist. / 阶段2 接 action-client,无 brick 时为空操作
  onAction: (brickId: string, action: string) => void;
  // True once the user has dragged the island → resize keeps its position instead of re-centering. / 用户拖过岛后为真→resize 保持位置而非重居中
  isPlaced: () => boolean;
  // User toggled pin in the UI → main persists it and echoes the authoritative state back. / 用户在 UI 切换 pin→main 持久化并回推权威态
  onSetPinned: (pinned: boolean) => void;
}

export function registerIpcHandlers(win: BrowserWindow, deps: IpcDeps): void {
  // renderer measured content → snap the window bound to fit (anchor-aware: top-center, or keep dragged pos). / renderer 量得内容→窗口边界贴合(锚点感知:顶部居中或保持拖动位)
  ipcMain.on(IPC.REQUEST_RESIZE, (_e, width: unknown, height: unknown) => {
    if (typeof width === 'number' && typeof height === 'number') {
      applyResize(win, width, height, { isPlaced: deps.isPlaced });
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
