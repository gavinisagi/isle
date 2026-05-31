// Main-side IPC: receive renderer requests, expose a snapshot pusher. / 主进程 IPC:接收 renderer 请求,暴露快照推送
import { ipcMain, type BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc.js';
import type { BusSnapshot } from '../../shared/types.js';
import { applyResize } from '../window/resize.js';

export interface IpcDeps {
  // Wired to the action-client in phase 2; a no-op until bricks exist. / 阶段2 接 action-client,无 brick 时为空操作
  onAction: (brickId: string, action: string) => void;
}

export function registerIpcHandlers(win: BrowserWindow, deps: IpcDeps): void {
  // renderer measured content → snap the window bound to fit (top-anchored, centered). / renderer 量得内容→窗口边界贴合(顶部锚定、居中)
  ipcMain.on(IPC.REQUEST_RESIZE, (_e, width: unknown, height: unknown) => {
    if (typeof width === 'number' && typeof height === 'number') applyResize(win, width, height);
  });

  // collapsed → pass-through (forward moves so renderer can re-arm on hover); interacting → capture. / 收起→穿透(转发 move 以便 hover 重新激活);交互→捕获
  ipcMain.on(IPC.SET_CLICK_THROUGH, (_e, passThrough: unknown) => {
    win.setIgnoreMouseEvents(Boolean(passThrough), { forward: true });
  });

  // renderer control press → action back to the owning brick. / renderer 控件按下→动作回推给所属 brick
  ipcMain.on(IPC.SEND_ACTION, (_e, brickId: unknown, action: unknown) => {
    if (typeof brickId === 'string' && typeof action === 'string') deps.onAction(brickId, action);
  });
}

// Push a fresh bus snapshot to the renderer. / 向 renderer 推送最新 bus 快照
export function pushBusSnapshot(win: BrowserWindow, snapshot: BusSnapshot): void {
  if (!win.isDestroyed()) win.webContents.send(IPC.BUS_SNAPSHOT, snapshot);
}
