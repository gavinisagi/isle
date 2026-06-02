// Preload: the ONLY bridge between renderer and main. contextIsolation on; renderer never touches Node. / preload:renderer 与 main 的唯一桥,开启 contextIsolation,renderer 永不碰 Node
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC } from '../shared/ipc.js';
import type { BusSnapshot, IsleBridge } from '../shared/types.js';

const bridge: IsleBridge = {
  onBusSnapshot(cb) {
    const listener = (_e: IpcRendererEvent, snapshot: BusSnapshot): void => cb(snapshot);
    ipcRenderer.on(IPC.BUS_SNAPSHOT, listener);
    return () => ipcRenderer.removeListener(IPC.BUS_SNAPSHOT, listener);
  },
  sendAction(brickId, action) {
    ipcRenderer.send(IPC.SEND_ACTION, brickId, action);
  },
  requestResize(width, height) {
    ipcRenderer.send(IPC.REQUEST_RESIZE, width, height);
  },
  setClickThrough(passThrough) {
    ipcRenderer.send(IPC.SET_CLICK_THROUGH, passThrough);
  },
  setPinned(pinned) {
    ipcRenderer.send(IPC.SET_PINNED, pinned);
  },
  onPinState(cb) {
    const listener = (_e: IpcRendererEvent, pinned: boolean): void => cb(pinned);
    ipcRenderer.on(IPC.PIN_STATE, listener);
    return () => ipcRenderer.removeListener(IPC.PIN_STATE, listener);
  },
  onCollapse(cb) {
    const listener = (): void => cb();
    ipcRenderer.on(IPC.COLLAPSE, listener);
    return () => ipcRenderer.removeListener(IPC.COLLAPSE, listener);
  },
};

contextBridge.exposeInMainWorld('isle', bridge);
