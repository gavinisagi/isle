// Subscribe the renderer to main's bus snapshots via a module-level external store. / 经模块级外部 store 让 renderer 订阅 main 的 bus 快照
import { useSyncExternalStore } from 'react';
import type { BusSnapshot } from '../../shared/types.js';

const EMPTY: BusSnapshot = { bricks: [] };

let current: BusSnapshot = EMPTY;
const listeners = new Set<() => void>();
let started = false;

function ensureSubscribed(): void {
  if (started || typeof window === 'undefined' || !window.isle) return;
  started = true;
  window.isle.onBusSnapshot((snapshot) => {
    current = snapshot; // new object each push → ref changes only on update / 每次推新对象,仅更新时引用变化
    for (const l of listeners) l();
  });
}

function subscribe(cb: () => void): () => void {
  ensureSubscribed();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): BusSnapshot {
  return current;
}

export function useIsleBus(): BusSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot);
}
