// Shows a brick's connection state. Degraded states read clearly so the island stays trustworthy. / 显示 brick 连接态;降级态清晰可读,让岛可信
import type { ConnState } from '@isle/protocol';

const LABEL: Record<ConnState, string> = {
  discovered: 'registered', // known from manifest, not yet streaming / 据 manifest 已知,未推流
  connecting: 'connecting',
  connected: 'live',
  disconnected: 'offline',
  stale: 'stale', // connected but silent past its heartbeat / 在线但超过 heartbeat 未推
};

export function DisconnectedBadge({ connState }: { connState: ConnState }): JSX.Element {
  return <span className={`isle-card__conn isle-card__conn--${connState}`}>{LABEL[connState]}</span>;
}
