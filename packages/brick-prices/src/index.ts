// Prices brick entry (Q17): register manifest, serve SSE, periodically push `metrics` from holdings + quotes. / 行情积木入口(Q17):注册 manifest、起 SSE、定时据持仓+行情推 metrics
// Config arrives as host-injected ISLE_CFG_* env (Q16 ②); the host owns the form, the brick owns the meaning. / 配置来自 host 注入的 ISLE_CFG_* env(Q16 ②);host 管表单,brick 管含义
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { MANIFEST_FILENAME, type Manifest, type MetricItem, type MetricTone, type Signal } from '@isle/protocol';
import { createBrickServer, type BrickServer } from './server.js';
import { readHoldings } from './holdings.js';
import { fetchQuotes, type Quote } from './yahoo.js';

const ID = 'prices';
const PORT = 7812;
const DEFAULT_REFRESH_MS = 600_000; // 10 min, matches PRD §7 / 10 分钟,与 PRD §7 一致

// Config the brick declares to the host (Q16 ②). The host renders these domain-blind. / 积木向 host 声明的配置(Q16 ②),host 域无知渲染
function buildManifest(refreshMs: number): Manifest {
  return {
    id: ID,
    name: '持仓行情',
    port: PORT,
    emits: ['metrics'],
    collapsed: { glyph: '$', badge: 'pnl' },
    actions: ['refresh'],
    // Host derives stale from this; we push on the refresh cadence. / host 据此推 stale,我们按刷新节奏推送
    heartbeat: refreshMs,
    config: [
      { key: 'holdingsPath', label: '持仓文件路径 (Obsidian)', type: 'string' },
      { key: 'yfinanceKey', label: 'YFinance API Key(可选)', type: 'secret' },
      { key: 'refreshMs', label: '刷新间隔 (ms)', type: 'number', default: DEFAULT_REFRESH_MS },
    ],
    // Host-managed spawn (Q16 ①); cwd is the plugin dir, so a built index.js sits beside plugin.json. / host 托管启动(Q16 ①),cwd 为插件目录,编译后的 index.js 与 plugin.json 同处
    launch: 'node ./index.js',
  };
}

// Drop the manifest where the host discovers it. / 把 manifest 落到 host 发现处
function register(manifest: Manifest): void {
  const dir = join(homedir(), '.island', 'plugins', ID);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, MANIFEST_FILENAME), JSON.stringify(manifest, null, 2));
}

// Map quotes → a domain-blind `metrics` signal (tone ∈ up/down/flat). / 行情→域无知 metrics 信号(tone ∈ up/down/flat)
function toMetrics(quotes: Quote[]): Signal {
  const items: MetricItem[] = quotes.map((q) => {
    const tone: MetricTone = q.changePercent > 0 ? 'up' : q.changePercent < 0 ? 'down' : 'flat';
    const sign = q.changePercent > 0 ? '+' : '';
    return {
      label: q.symbol,
      value: q.price.toFixed(2),
      delta: `${sign}${q.changePercent.toFixed(2)}%`,
      tone,
    };
  });
  return { kind: 'metrics', ts: Math.floor(Date.now() / 1000), data: { items } };
}

async function refresh(server: BrickServer, holdingsPath: string | undefined, apiKey: string | undefined): Promise<void> {
  try {
    const holdings = holdingsPath ? await readHoldings(holdingsPath) : [];
    const quotes = await fetchQuotes(
      holdings.map((h) => h.symbol),
      apiKey,
    );
    server.broadcast(toMetrics(quotes));
  } catch (err) {
    // A data-source failure must never crash the brick — the host degrades gracefully. / 数据源失败绝不崩积木,host 自会优雅降级
    console.error('[prices] refresh failed / 刷新失败:', err);
  }
}

function main(): void {
  const holdingsPath = process.env['ISLE_CFG_HOLDINGSPATH'];
  const apiKey = process.env['ISLE_CFG_YFINANCEKEY'];
  const refreshMs = Number(process.env['ISLE_CFG_REFRESHMS']) || DEFAULT_REFRESH_MS;

  register(buildManifest(refreshMs));

  const server = createBrickServer({
    port: PORT,
    onAction: (frame) => {
      // The only declared action: refresh now. / 唯一声明的动作:立即刷新
      if (frame.name === 'refresh') void refresh(server, holdingsPath, apiKey);
    },
  });

  void refresh(server, holdingsPath, apiKey); // initial push / 首次推送
  const timer = setInterval(() => void refresh(server, holdingsPath, apiKey), refreshMs);

  const shutdown = (): void => {
    clearInterval(timer);
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.warn(`▶ prices on :${PORT} (refresh ${refreshMs}ms, holdings=${holdingsPath ?? 'unset / 未配置'})`);
}

main();
