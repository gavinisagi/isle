// IPC channel names shared by main and preload. One place to avoid string drift. / main 与 preload 共享的 IPC 频道名,集中定义防止字符串漂移
export const IPC = {
  // main → renderer: push a new BusSnapshot. / main→renderer 推送新快照
  BUS_SNAPSHOT: 'isle:bus-snapshot',
  // renderer → main: POST an action to a brick. / renderer→main 回推动作
  SEND_ACTION: 'isle:send-action',
  // renderer → main: request a window resize. / renderer→main 请求窗口尺寸
  REQUEST_RESIZE: 'isle:request-resize',
  // renderer → main: toggle click-through. / renderer→main 切换穿透
  SET_CLICK_THROUGH: 'isle:set-click-through',
  // renderer → main: user toggled pin (persist + drive never-collapse). / renderer→main 用户切换 pin
  SET_PINNED: 'isle:set-pinned',
  // main → renderer: authoritative pin state (initial restore / hotkey / echo). / main→renderer 权威 pin 态
  PIN_STATE: 'isle:pin-state',
  // main → renderer: collapse now (e.g. window lost focus) — reliable where DOM mouse-leave isn't. / main→renderer 立即收回(如窗口失焦)——DOM mouseleave 不可靠时的可靠信号
  COLLAPSE: 'isle:collapse',
  // renderer → main: begin a JS drag session (peek-row drag, Q14) — main records the window + cursor origin. / renderer→main 开始 JS 拖动会话(peek 整行拖,Q14)——main 记录窗口+光标起点
  DRAG_START: 'isle:drag-start',
  // renderer → main: a drag tick — main moves the window to track the OS cursor (DIP). / renderer→main 拖动帧——main 按 OS 光标(DIP)移窗
  DRAG_MOVE: 'isle:drag-move',
  // renderer → main: end the drag session — main persists the final position as a user placement. / renderer→main 结束拖动——main 持久化最终位置为用户放置
  DRAG_END: 'isle:drag-end',
  // renderer ⇄ main (invoke): get a brick's saved config values to prefill the form (Q16 ②). / renderer⇄main(invoke)取某 brick 已存配置值以预填表单(Q16 ②)
  GET_BRICK_CONFIG: 'isle:get-brick-config',
  // renderer ⇄ main (invoke): save a brick's config values → persist + respawn with new env (Q16 ②). / renderer⇄main(invoke)保存配置值→持久化+带新 env 重启(Q16 ②)
  SET_BRICK_CONFIG: 'isle:set-brick-config',
  // renderer ⇄ main (invoke): get persisted expanded-card sizes to apply on mount (Q18). / renderer⇄main(invoke)取已存展开卡尺寸以挂载时应用(Q18)
  GET_CARD_SIZES: 'isle:get-card-sizes',
  // renderer → main: a card resize drag ended — persist this brick's card size (Q18). / renderer→main 卡片 resize 拖动结束——持久化该 brick 卡尺寸(Q18)
  SET_CARD_SIZE: 'isle:set-card-size',
} as const;
