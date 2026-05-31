// The island shell: collapsed ↔ peek ↔ expanded, spring-animated, click-through-aware. / 岛壳:收起↔peek↔展开,弹簧动画,感知穿透
import { useEffect, useRef, useState } from 'react';
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
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the OS window bound glued to measured content (incl. during the spring). / 让 OS 窗口边界紧贴内容(含弹簧过程)
  useMeasuredBounds(rootRef);

  // Interactive when expanded or hovered; otherwise pass clicks through to the desktop. / 展开或 hover 时可交互,否则点击穿透到桌面
  useEffect(() => {
    window.isle.setClickThrough(!(expanded || hovered));
  }, [expanded, hovered]);

  // tone:attention → auto pop-open on the rising edge (e.g. an agent starts waiting). / tone:attention 上升沿自动弹开(如某 agent 开始等待)
  const attention = snapshotHasAttention(snapshot);
  const prevAttention = useRef(false);
  useEffect(() => {
    if (attention && !prevAttention.current) setExpanded(true);
    prevAttention.current = attention;
  }, [attention]);

  const bricks = snapshot.bricks;
  const peek = hovered && !expanded;

  return (
    <motion.div
      ref={rootRef}
      layout
      transition={SPRING}
      className={`isle${expanded ? ' isle--expanded' : ''}${peek ? ' isle--peek' : ''}${attention ? ' isle--attention' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setExpanded((v) => !v)}
    >
      {expanded ? (
        <motion.div layout="position" key="expanded">
          <div className="isle__grip" aria-hidden>
            <span className="isle__chevron">⌄</span>
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
