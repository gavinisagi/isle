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
} as const;
