// Timetable engine: emit signals over time per a script, optionally looping. / 时间表引擎:按脚本随时间推 signal,可循环
import type { ActionFrame, Manifest, Signal } from '@isle/protocol';

export interface ScriptStep {
  // Wait this many ms before emitting (relative to the previous step). / 发射前等待 ms(相对上一步)
  after: number;
  // Static signal, or a thunk for dynamic values (e.g. changing metrics). / 静态 signal 或动态求值(如变动的 metrics)
  signal: Signal | (() => Signal);
}

export interface Script {
  steps: ScriptStep[];
  loop?: boolean;
}

// One mock brick: its manifest + how it streams + how it reacts to actions. / 一个 mock 积木:manifest + 如何推流 + 如何响应动作
export interface Preset {
  manifest: Manifest;
  script: Script;
  // control→action round-trip: an action may push a new signal back. / control→action 往返:动作可回推新 signal
  onAction?: (frame: ActionFrame, broadcast: (s: Signal) => void) => void;
}

// epoch seconds, as the signal `ts` contract expects. / epoch 秒,符合 signal ts 约定
export const nowTs = (): number => Math.floor(Date.now() / 1000);

const sleep = (ms: number, bag: NodeJS.Timeout[]): Promise<void> =>
  new Promise((resolve) => {
    bag.push(setTimeout(resolve, ms));
  });

// Run a script against a broadcast fn; returns a cancel fn. / 用 broadcast 跑脚本,返回取消函数
export function runScript(script: Script, broadcast: (s: Signal) => void): () => void {
  let cancelled = false;
  const timers: NodeJS.Timeout[] = [];

  const run = async (): Promise<void> => {
    do {
      for (const step of script.steps) {
        if (cancelled) return;
        await sleep(step.after, timers);
        if (cancelled) return;
        broadcast(typeof step.signal === 'function' ? step.signal() : step.signal);
      }
    } while (script.loop && !cancelled);
  };

  void run();

  return () => {
    cancelled = true;
    for (const t of timers) clearTimeout(t);
  };
}
