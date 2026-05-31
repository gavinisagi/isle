// Root component. Live bus snapshots (main → IPC → renderer) drive the shell. / 根组件:实时 bus 快照(main→IPC→renderer)驱动壳
import { IslandShell } from './island/IslandShell.js';
import { useIsleBus } from './ipc/useIsleBus.js';

export function App(): JSX.Element {
  const snapshot = useIsleBus();
  return <IslandShell snapshot={snapshot} />;
}
