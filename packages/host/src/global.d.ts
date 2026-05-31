// Make the preload-exposed bridge visible to the renderer's type system. / 让 preload 暴露的桥对 renderer 类型系统可见
import type { IsleBridge } from '../shared/types.js';

declare global {
  interface Window {
    isle: IsleBridge;
  }
}

export {};
