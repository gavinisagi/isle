// Failure-path injection. Turns the acceptance criteria's "abnormal paths" into repeatable behavior. / 异常路径注入,把验收的异常路径变成可重复行为
// Enabled via env ISLE_MOCK_CHAOS=1; off by default so normal runs stay clean. / 经 env ISLE_MOCK_CHAOS=1 开启,默认关
import type { BrickServer } from './server.js';

export interface ChaosHandle {
  stop: () => void;
}

// Periodically drop all SSE connections to exercise the host's reconnect + last-event-id resume. / 周期性强断 SSE,测 host 重连 + last-event-id 续传
export function scheduleConnectionDrops(server: BrickServer, intervalMs: number): ChaosHandle {
  const timer = setInterval(() => {
    if (server.clientCount() > 0) {
      console.log(`[chaos] dropping ${server.clientCount()} connection(s) / 强断连接`);
      server.dropConnections();
    }
  }, intervalMs);
  return { stop: () => clearInterval(timer) };
}

// Take a brick fully offline after a delay (tests "brick down → island survives"). / 延迟后让 brick 彻底下线(测"积木下线→整岛存活")
export function scheduleOffline(server: BrickServer, afterMs: number, label: string): ChaosHandle {
  const timer = setTimeout(() => {
    console.log(`[chaos] ${label} going offline / 下线`);
    server.close();
  }, afterMs);
  return { stop: () => clearTimeout(timer) };
}
