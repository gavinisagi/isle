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

interface IslandShellProps {
  snapshot: BusSnapshot;
}

export function IslandShell({ snapshot }: IslandShellProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Main owns pin (global hotkey + persistence); we mirror its authoritative state. / main 持有 pin(全局热键+持久化),这里镜像权威态
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // While Date.now() < this, a click-expanded island won't auto-collapse even if unhovered. / 在此时刻前,点击展开的岛即使未 hover 也不自动收
  const graceUntil = useRef(0);

  // Keep the OS window bound glued to measured content (incl. during the spring). / 让 OS 窗口边界紧贴内容(含弹簧过程)
  useMeasuredBounds(rootRef);

  useEffect(() => window.isle.onPinState(setPinned), []);

  // Main can force a collapse (e.g. the window lost focus) — a reliable signal where DOM mouse-leave isn't. / main 可强制收回(如窗口失焦)——DOM mouseleave 不可靠时的可靠信号
  useEffect(() => window.isle.onCollapse(() => setExpanded(false)), []);

  // Pinned forces the island open; otherwise it follows click/hover. / pin 时强制展开,否则随点击/hover
  const open = expanded || pinned;

  // Interactive when open or hovered; otherwise pass clicks through to the desktop. / open 或 hover 时可交互,否则点击穿透到桌面
  useEffect(() => {
    window.isle.setClickThrough(!(open || hovered));
  }, [open, hovered]);

  // tone:attention only GLOWS the island/pill (see DESIGN Q12) — it must NOT auto-expand. / tone:attention 只让岛/pill 发光(见 DESIGN Q12),不自动展开
  // Auto-changing the open state on its own makes the peek/expanded states untestable and is distracting. / 自行切换展开态既难测又打扰
  const attention = snapshotHasAttention(snapshot);

  const bricks = snapshot.bricks;
  const peek = hovered && !open;

  // Hover just tracks pointer presence; the collapse policy lives in the effect below. / hover 只记录指针在不在;收回策略在下面的 effect
  const handleMouseEnter = (): void => setHovered(true);
  const handleMouseLeave = (): void => setHovered(false);

  // Click only EXPANDS (and opens the grace window). It must NOT collapse: the expanded panel holds / 点击只负责展开(并开启宽限期),绝不收回:展开面板内有
  // interactive content, so clicking content shouldn't dismiss it. Collapse via ×, moving away, or unpin. / 可交互内容,点内容不该把它关掉。收回靠 ×、移开、或取消 pin
  const handleClick = (): void => {
    if (open) return;
    graceUntil.current = Date.now() + EXPAND_GRACE_MS;
    setExpanded(true);
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
      layout
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
        <motion.div layout="position" key="collapsed" className="isle__pills">
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
