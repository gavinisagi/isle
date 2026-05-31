// Sync the OS window bound to the island's measured content — including during Framer spring. / 把 OS 窗口边界同步到岛的内容尺寸,含 Framer 弹簧过程中
// getBoundingClientRect() reflects in-flight transforms, so a rAF loop tracks the spring smoothly. / getBoundingClientRect 含进行中的 transform,故 rAF 循环可平滑跟踪弹簧
import { useEffect, type RefObject } from 'react';

// Extra px around content so shadow / spring overshoot never clips. / 内容外余量,避免阴影/弹簧过冲被裁
const MARGIN = 28;
// Stop the loop once size holds steady this many frames. / 尺寸稳定这么多帧后停循环
const STABLE_FRAMES = 6;

export function useMeasuredBounds(ref: RefObject<HTMLElement>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let lastW = 0;
    let lastH = 0;
    let stable = 0;
    let rafId: number | null = null;

    const report = (): boolean => {
      const rect = el.getBoundingClientRect();
      const w = Math.ceil(rect.width) + MARGIN;
      const h = Math.ceil(rect.height) + MARGIN;
      if (Math.abs(w - lastW) >= 1 || Math.abs(h - lastH) >= 1) {
        lastW = w;
        lastH = h;
        window.isle.requestResize(w, h);
        return true; // changed / 有变化
      }
      return false; // steady / 稳定
    };

    const loop = (): void => {
      stable = report() ? 0 : stable + 1;
      rafId = stable < STABLE_FRAMES ? requestAnimationFrame(loop) : null;
    };

    const kick = (): void => {
      if (rafId == null) {
        stable = 0;
        rafId = requestAnimationFrame(loop);
      }
    };

    // Any content/layout change re-arms the tracking loop. / 任何内容/布局变化重新激活跟踪循环
    const ro = new ResizeObserver(kick);
    ro.observe(el);
    kick(); // initial measure / 首次测量

    return () => {
      ro.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [ref]);
}
