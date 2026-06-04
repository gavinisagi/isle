// The island shell: collapsed ↔ peek ↔ expanded, spring-animated, click-through-aware, draggable + pinnable. / 岛壳:收起↔peek↔展开,弹簧动画,感知穿透,可拖动+可 pin
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import type { BusSnapshot } from '../../shared/types.js';
import { Pill } from './Pill.js';
import { ExpandedPanel } from './ExpandedPanel.js';
import { useMeasuredBounds } from './useMeasuredBounds.js';
import { snapshotHasAttention } from './attention.js';

// Snappy but soft — tuned so the window-resize tracking reads as one motion. / 干脆又柔和,调到与窗口跟随读作一个动作
const SPRING = { type: 'spring', stiffness: 520, damping: 38, mass: 0.9 } as const;

// After a click-to-expand, keep the island open for this grace period regardless of the mouse, / 点击展开后,这段宽限期内不论鼠标在不在都保持展开,
// so a click doesn't instantly snap back when the cursor isn't over the (larger) expanded panel. / 避免光标不在(更大的)展开面板内时点击即回弹
const EXPAND_GRACE_MS = 5000;
// Minimum debounce on mouse-leave — absorbs the transient leave from the expand-resize jitter. / 鼠标离开的最小去抖——吸收展开 resize 抖动的瞬时离开
const LEAVE_DEBOUNCE_MS = 180;
// Cursor travel (px) before a press counts as a drag, not a click — keeps peek-row click-to-expand alive (Q14). / 按下后位移超此值(px)才算拖动而非点击——保住 peek 整行的点击展开(Q14)
const DRAG_THRESHOLD_PX = 4;

interface IslandShellProps {
  snapshot: BusSnapshot;
}

export function IslandShell({ snapshot }: IslandShellProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Main owns pin (global hotkey + persistence); we mirror its authoritative state. / main 持有 pin(全局热键+持久化),这里镜像权威态
  const [pinned, setPinned] = useState(false);
  // True for the duration of a peek-row drag — locks peek + keeps the window interactive so a fast drag / peek 整行拖动期间为真——锁住 peek 并保持窗口可交互,使快速拖动
  // (cursor outrunning the window → mouse-leave) can't drop hover, shrink the pill, and trigger a re-centering resize. / (光标甩出窗口→mouse-leave)不会丢 hover、收窄 pill、触发重居中 resize
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // While Date.now() < this, a click-expanded island won't auto-collapse even if unhovered. / 在此时刻前,点击展开的岛即使未 hover 也不自动收
  const graceUntil = useRef(0);
  // Set when a drag just ended, so the click that terminates the drag doesn't also expand (Q14). / 拖动刚结束时置位,使结束拖动的那次 click 不再误展开(Q14)
  const justDragged = useRef(false);

  // Keep the OS window bound glued to measured content (incl. during the spring). / 让 OS 窗口边界紧贴内容(含弹簧过程)
  useMeasuredBounds(rootRef);

  useEffect(() => window.isle.onPinState(setPinned), []);

  // Main can force a collapse (e.g. the window lost focus) — a reliable signal where DOM mouse-leave isn't. / main 可强制收回(如窗口失焦)——DOM mouseleave 不可靠时的可靠信号
  // Clear hover too: this signal exists precisely because mouse-leave is unreliable, so a stale hovered=true / 同时清 hover:本信号正因 mouseleave 不可靠才存在,残留的 hovered=true
  // would otherwise drop the island into peek (hovered && !open) instead of fully collapsing the pill. / 否则会让岛落进 peek(hovered && !open),而非完全收起 pill
  useEffect(() => window.isle.onCollapse(() => { setExpanded(false); setHovered(false); }), []);

  // Pinned forces the island open; otherwise it follows click/hover. / pin 时强制展开,否则随点击/hover
  const open = expanded || pinned;

  // Interactive when open or hovered; otherwise pass clicks through to the desktop. / open 或 hover 时可交互,否则点击穿透到桌面
  useEffect(() => {
    window.isle.setClickThrough(!(open || hovered || dragging));
  }, [open, hovered, dragging]);

  // tone:attention only GLOWS the island/pill (see DESIGN Q12) — it must NOT auto-expand. / tone:attention 只让岛/pill 发光(见 DESIGN Q12),不自动展开
  // Auto-changing the open state on its own makes the peek/expanded states untestable and is distracting. / 自行切换展开态既难测又打扰
  const attention = snapshotHasAttention(snapshot);

  const bricks = snapshot.bricks;
  const peek = (hovered || dragging) && !open;

  // Hover just tracks pointer presence; the collapse policy lives in the effect below. / hover 只记录指针在不在;收回策略在下面的 effect
  const handleMouseEnter = (): void => setHovered(true);
  const handleMouseLeave = (): void => setHovered(false);

  // Click only EXPANDS (and opens the grace window). It must NOT collapse: the expanded panel holds / 点击只负责展开(并开启宽限期),绝不收回:展开面板内有
  // interactive content, so clicking content shouldn't dismiss it. Collapse via ×, moving away, or unpin. / 可交互内容,点内容不该把它关掉。收回靠 ×、移开、或取消 pin
  const handleClick = (): void => {
    if (justDragged.current) {
      justDragged.current = false; // swallow the click that ended a drag / 吞掉结束拖动的那次 click
      return;
    }
    if (open) return;
    graceUntil.current = Date.now() + EXPAND_GRACE_MS;
    setExpanded(true);
  };

  // Drag the whole peek row to move the island (Q14, supersedes Q13's tiny handle). A sub-threshold press / 拖动整个 peek 行移岛(Q14,取代 Q13 小握把)。低于阈值的按下
  // stays a click → expand; past it, drive a JS drag session via main (OS-cursor-tracked, DIP-correct). / 仍是 click→展开;超过则经 main 跑 JS 拖动会话(跟踪 OS 光标、DIP 正确)
  // We avoid -webkit-app-region: drag here because it would swallow the click that expands. / 此处不用 -webkit-app-region: drag,因为它会吞掉展开用的点击
  const handlePillsPointerDown = (e: MouseEvent): void => {
    if (e.button !== 0 || open) return; // left button, peek only (expanded has its own grip) / 仅左键、仅 peek(展开态有自带 grip)
    const startX = e.screenX;
    const startY = e.screenY;
    let moved = false;
    let raf = 0;
    window.isle.dragStart();
    const onMove = (m: globalThis.MouseEvent): void => {
      if (!moved && (Math.abs(m.screenX - startX) >= DRAG_THRESHOLD_PX || Math.abs(m.screenY - startY) >= DRAG_THRESHOLD_PX)) {
        moved = true;
        setDragging(true); // entering a real drag: lock peek + keep interactive until mouseup / 进入真正拖动:锁住 peek + 保持可交互直到 mouseup
      }
      if (moved && raf === 0) {
        // Coalesce to one move IPC per frame. / 每帧合并为一次移动 IPC
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          window.isle.dragMove();
        });
      }
    };
    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (raf !== 0) window.cancelAnimationFrame(raf);
      if (moved) {
        justDragged.current = true; // the trailing click must not expand / 随后的 click 不应展开
        window.isle.dragEnd(); // persists placed=true FIRST, so the post-drag shrink resize anchors (no re-center) / 先持久化 placed=true,使拖动后收窄 resize 锚定(不重居中)
        setDragging(false); // drag over: if the cursor ended off the island, hover is already false → collapse to pill / 拖动结束:若光标停在岛外,hover 已为 false→收回 pill
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Auto-collapse policy: collapse only when expanded, not pinned, and the mouse isn't over it — / 自动收回策略:仅"已展开、未 pin、鼠标不在其上"才收——
  // never before the post-click grace ends, and with a min debounce to absorb the resize jitter. / 不早于点击宽限期结束,且带最小去抖吸收 resize 抖动
  // Re-running on [expanded, hovered, pinned] (re-enter / pin / collapse) cancels a pending collapse. / 依赖变化(重进入/pin/已收)取消待收回
  useEffect(() => {
    if (!expanded || pinned || hovered) return;
    const wait = Math.max(graceUntil.current - Date.now(), LEAVE_DEBOUNCE_MS);
    const id = window.setTimeout(() => setExpanded(false), wait);
    return () => window.clearTimeout(id);
  }, [expanded, hovered, pinned]);

  // Pin button → ask main to flip pin; main echoes PIN_STATE back to update `pinned`. / pin 按钮→请 main 翻转,main 回推 PIN_STATE 更新 pinned
  const togglePin = (e: MouseEvent): void => {
    e.stopPropagation(); // don't also toggle expand via the root onClick / 不经 root onClick 顺带切换展开
    window.isle.setPinned(!pinned);
  };

  // Collapse (×): unpin and close. / 收起:取消 pin 并关闭
  const collapse = (e: MouseEvent): void => {
    e.stopPropagation();
    window.isle.setPinned(false);
    setExpanded(false);
  };

  // Hover / click / leave bind to the VISIBLE island (`.isle`), not the window. The window has a / hover/点击/离开绑在"可见的岛"`.isle`,而非整窗。窗口含
  // transparent shadow margin whose edges track mouse-leave unreliably & asymmetrically on a transparent / 透明阴影边距,其各边的 mouse-leave 在透明窗口上不可靠且不对称;
  // window — leaving the visible island collapses uniformly in every direction. The click-only-expand / 改用"离开可见的岛"则四向一致收回。点击只展开 +
  // policy + grace window absorb the transient leave from the expand-resize jitter. / 宽限期吸收展开 resize 抖动造成的瞬时离开
  return (
    <motion.div
      ref={rootRef}
      // Animate SIZE only — position is owned by `#root` centering + the window resize. Letting framer / 只动尺寸——位置交给 `#root` 居中 + 窗口 resize。让 framer
      // also animate position fights the per-frame window re-center, which made peek appear then jump right. / 同时动位置会和每帧窗口重居中抢位,导致 peek 先出现再右移
      layout="size"
      transition={SPRING}
      className={`isle${open ? ' isle--expanded' : ''}${peek ? ' isle--peek' : ''}${attention ? ' isle--attention' : ''}${pinned ? ' isle--pinned' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {open ? (
        <motion.div layout="position" key="expanded">
          {/* Grip bar: drag to move the island (the bar is the OS drag region); buttons stay clickable. / 抓握条:拖动移岛(整条是 OS 拖动区),按钮保持可点 */}
          <div className="isle__grip">
            <button className="isle__pin" onClick={togglePin} aria-pressed={pinned} title="Pin / 固定 (Ctrl+Alt+I)">
              {pinned ? '📌' : '📍'}
            </button>
            <span className="isle__chevron" aria-hidden>⌄</span>
            <button className="isle__collapse" onClick={collapse} aria-label="Collapse" title="Collapse / 收起">
              ×
            </button>
          </div>
          <ExpandedPanel bricks={bricks} />
        </motion.div>
      ) : (
        <motion.div
          layout="position"
          key="collapsed"
          className="isle__pills"
          // Whole-row drag (Q14): press-drag to move the island; a sub-threshold press falls through to expand. / 整行拖动(Q14):按住拖动移岛;低于阈值的按下落到点击展开
          onMouseDown={handlePillsPointerDown}
        >
          {bricks.length === 0 ? (
            <span className="isle__empty">Isle</span>
          ) : (
            bricks.map((brick) => <Pill key={brick.manifest.id} brick={brick} showLabel={peek} />)
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
