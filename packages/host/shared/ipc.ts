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
} as const;
