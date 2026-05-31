// The render-kind dispatcher: switch on `kind`, exhaustively. This is the host's whole "understanding". / 渲染词表分发器:对 kind 穷尽 switch,这就是 host 的全部"理解"
import type { Signal } from '@isle/protocol';
import { ListView } from './ListView.js';
import { MetricsView } from './MetricsView.js';
import { StatusView } from './StatusView.js';
import { TextView } from './TextView.js';
import { ControlView } from './ControlView.js';
import { ViewView } from './ViewView.js';

export function RenderKind({ signal, brickId }: { signal: Signal; brickId: string }): JSX.Element {
  switch (signal.kind) {
    case 'list':
      return <ListView items={signal.data.items} />;
    case 'metrics':
      return <MetricsView items={signal.data.items} />;
    case 'status':
      return <StatusView items={signal.data.items} />;
    case 'text':
      return <TextView data={signal.data} />;
    case 'control':
      return <ControlView controls={signal.data.controls} brickId={brickId} />;
    case 'view':
      return <ViewView data={signal.data} brickId={brickId} />;
    default:
      // Exhaustiveness guard: a new kind would surface as a compile error here. / 穷尽性守卫:新增 kind 会在此编译报错
      return assertNever(signal);
  }
}

function assertNever(x: never): never {
  throw new Error(`Unhandled render kind / 未处理的渲染词表: ${JSON.stringify(x)}`);
}
