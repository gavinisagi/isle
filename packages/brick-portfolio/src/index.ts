// Portfolio brick entry (Q17/Q21): register manifest, serve SSE, periodically push `metrics`. / 持仓积木入口(Q17/Q21):注册 manifest、起 SSE、定时推 metrics
// Reads holdings from an Obsidian vault JSON; config arrives as host-injected ISLE_CFG_* env (Q16 ②). / 从 Obsidian vault JSON 读持仓;配置来自 host 注入的 ISLE_CFG_* env(Q16 ②)
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { MANIFEST_FILENAME, type Manifest, type MetricItem, type MetricTone, type Signal } from '@isle/protocol';
import { createBrickServer, type BrickServer } from './server.js';
import { readHoldings } from './holdings.js';
import { fetchQuotes, toYahooSymbol, type Quote } from './yahoo.js';

const ID = 'portfolio';
const PORT = 7820; // off the mock's 781x range so mock + portfolio coexist (Q22) / 避开 mock 的 781x 段,使 mock 与 portfolio 并存(Q22)
const DEFAULT_REFRESH_MS = 600_000; // 10 min, matches PRD §7 / 10 分钟,与 PRD §7 一致

// Config the brick declares to the host (Q16 ②). The host renders these domain-blind. / 积木向 host 声明的配置(Q16 ②),host 域无知渲染
function buildManifest(refreshMs: number): Manifest {
  return {
    id: ID,
    name: '持仓',
    port: PORT,
    emits: ['metrics'],
    collapsed: { glyph: '$', badge: 'pnl' },
    actions: ['refresh'],
    // Host derives stale from this; we push on the refresh cadence. / host 据此推 stale,我们按刷新节奏推送
    heartbeat: refreshMs,
    config: [
      { key: 'holdingsPath', label: '持仓文件路径 (持仓.json)', type: 'string' },
      { key: 'refreshMs', label: '刷新间隔 (ms)', type: 'number', default: DEFAULT_REFRESH_MS },
    ],
    // No `launch` (Q22): in dev the brick is started by `pnpm dev` (tsx), so the host only / 不声明 launch(Q22):dev 期由 pnpm dev(tsx)起,host 仅
    // discovers + connects — declaring launch would make the host auto-spawn a second copy / 发现+连接;声明 launch 会让 host 再 auto-spawn 一个抢端口。
    // contending for the port. (Re-add launch once we ship a built index.js for host-managed spawn.) / 待出 built index.js 做 host 托管时再加回 launch
  };
}

// Drop the manifest where the host discovers it. / 把 manifest 落到 host 发现处
function register(manifest: Manifest): void {
  const dir = join(homedir(), '.island', 'plugins', ID);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, MANIFEST_FILENAME), JSON.stringify(manifest, null, 2));
}

// Map quotes → a domain-blind `metrics` signal (tone ∈ up/down/flat). Label uses the holding's code. / 行情→域无知 metrics 信号(tone ∈ up/down/flat),label 用持仓代码
function toMetrics(quotes: Quote[]): Signal {
  const items: MetricItem[] = quotes.map((q) => {
    const tone: MetricTone = q.changePercent > 0 ? 'up' : q.changePercent < 0 ? 'down' : 'flat';
    const sign = q.changePercent > 0 ? '+' : '';
    return {
      label: q.code,
      value: q.price.toFixed(2),
      delta: `${sign}${q.changePercent.toFixed(2)}%`,
      tone,
    };
  });
  return { kind: 'metrics', ts: Math.floor(Date.now() / 1000), data: { items } };
}

// Read holdings → resolve Yahoo symbols (by type) → fetch quotes → metrics signal. / 读持仓→按 type 解析 Yahoo 符号→取行情→metrics 信号
async function buildSignal(holdingsPath: string | undefined): Promise<Signal> {
  const holdings = holdingsPath ? await readHoldings(holdingsPath) : [];
  const quotes = await fetchQuotes(
    holdings.map((h) => ({ symbol: toYahooSymbol(h.code, h.type), code: h.code, name: h.name })),
  );
  return toMetrics(quotes);
}

async function refresh(server: BrickServer, holdingsPath: string | undefined): Promise<void> {
  try {
    server.broadcast(await buildSignal(holdingsPath));
  } catch (err) {
    // A data-source failure must never crash the brick — the host degrades gracefully. / 数据源失败绝不崩积木,host 自会优雅降级
    console.error('[portfolio] refresh failed / 刷新失败:', err);
  }
}

// `--once`: read + fetch once, print the metrics signal as JSON, exit. Acceptance / dev aid (Q21). / 读+取一次、打印 metrics JSON 后退出;验收 / dev 辅助(Q21)
async function runOnce(holdingsPath: string | undefined): Promise<void> {
  try {
    console.warn(JSON.stringify(await buildSignal(holdingsPath), null, 2));
  } catch (err) {
    console.error('[portfolio] --once failed / 失败:', err);
    process.exit(1);
  }
}

function main(): void {
  // Standalone dev runs read a local .env (gitignored) to fill ISLE_CFG_* (Q22). When the host / 独立 dev 运行读本地 .env(gitignored)填 ISLE_CFG_*(Q22);当 host
  // spawns the brick it injects the env instead, so a missing .env is fine. / spawn 本积木时改由 host 注入 env,故无 .env 也正常
  try {
    process.loadEnvFile(new URL('../.env', import.meta.url));
  } catch {
    // No local .env — rely on the real (host-injected) environment. / 无本地 .env,依赖真实(host 注入)环境
  }

  const holdingsPath = process.env['ISLE_CFG_HOLDINGSPATH'];
  const refreshMs = Number(process.env['ISLE_CFG_REFRESHMS']) || DEFAULT_REFRESH_MS;

  if (process.argv.includes('--once')) {
    void runOnce(holdingsPath);
    return;
  }

  register(buildManifest(refreshMs));

  const server = createBrickServer({
    port: PORT,
    onAction: (frame) => {
      // The only declared action: refresh now. / 唯一声明的动作:立即刷新
      if (frame.name === 'refresh') void refresh(server, holdingsPath);
    },
  });

  void refresh(server, holdingsPath); // initial push / 首次推送
  const timer = setInterval(() => void refresh(server, holdingsPath), refreshMs);

  const shutdown = (): void => {
    clearInterval(timer);
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.warn(`▶ portfolio on :${PORT} (refresh ${refreshMs}ms, holdings=${holdingsPath ?? 'unset / 未配置'})`);
}

main();
