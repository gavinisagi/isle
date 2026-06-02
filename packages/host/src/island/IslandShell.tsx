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

interface IslandShellProps {
  snapshot: BusSnapshot;
}

export function IslandShell({ snapshot }: IslandShellProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Main owns pin (global hotkey + persistence); we mirror its authoritative state. / main 持有 pin(全局热键+持久化),这里镜像权威态
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the OS window bound glued to measured content (incl. during the spring). / 让 OS 窗口边界紧贴内容(含弹簧过程)
  useMeasuredBounds(rootRef);

  useEffect(() => window.isle.onPinState(setPinned), []);

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

  // Leaving the island auto-collapses it — unless pinned. / 鼠标离开自动收回——除非已 pin
  const handleMouseLeave = (): void => {
    setHovered(false);
    if (!pinned) setExpanded(false);
  };

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

  // Hover/click/leave live on a full-window wrapper, not on `.isle` itself. The window is sized to / 交互(hover/点击/离开)挂在填满整窗的外层,而非 `.isle` 本体。窗口比岛大一圈
  // content + a shadow/overshoot margin, so there's a transparent ring around the visible island; / (阴影/过冲余量),岛四周有透明环;
  // binding here means clicking that ring still expands (not a dead zone) and only LEAVING THE WINDOW / 挂在外层→点透明环也能展开(非死区),且只有真正离开窗口
  // collapses — a transient mouse-leave during the expand resize no longer mis-collapses the island. / 才收回——展开 resize 过程中的瞬时 leave 不再误收
  return (
    <div
      className="isle-hit"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => setExpanded((v) => !v)}
    >
      <motion.div
        ref={rootRef}
        layout
        transition={SPRING}
        className={`isle${open ? ' isle--expanded' : ''}${peek ? ' isle--peek' : ''}${attention ? ' isle--attention' : ''}${pinned ? ' isle--pinned' : ''}`}
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
    </div>
  );
}
