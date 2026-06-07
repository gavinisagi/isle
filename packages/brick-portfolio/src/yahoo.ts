// Fetch quotes from Yahoo Finance v8 chart (Q21): public, key-free, avoids v7 quote's crumb/403. / 从 Yahoo v8 chart 取行情(Q21):公开免 key,避开 v7 quote 的 crumb/403
// Brick DOMAIN logic — if Yahoo's shape shifts, adjust here without touching the host. / 积木领域逻辑,Yahoo 形态变改这里即可,不动 host
export interface Quote {
  // Yahoo symbol used for the request (e.g. BTC-USD). / 请求用的 Yahoo 符号(如 BTC-USD)
  symbol: string;
  // Original holding code (e.g. BTC) — used as the card label. / 原始持仓代码(如 BTC),用作卡片 label
  code: string;
  // Display name (kept for future label switching). / 显示名(留作未来切换 label)
  name: string;
  price: number;
  // Day change percentage (e.g. +1.8 → up 1.8%). / 当日涨跌百分比(如 +1.8 → 涨 1.8%)
  changePercent: number;
}

// Map a holding (code + type) to a Yahoo symbol (Q21). / 把持仓(code + type)映射成 Yahoo 符号(Q21)
export function toYahooSymbol(code: string, type: string): string {
  if (type === '加密') return `${code}-USD`; // crypto → e.g. BTC-USD / 加密 → 如 BTC-USD
  return code; // stocks: US tickers used as-is / 股票:美股代码直接用
}

async function fetchOne(symbol: string, code: string, name: string): Promise<Quote | null> {
  // range=1d makes `chartPreviousClose` the prior-session close, so the day change is correct. / range=1d 让 chartPreviousClose 为上一交易日收盘,日涨跌才正确
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  // A UA header keeps Yahoo from occasionally rejecting bare clients. / 带 UA 头,避免 Yahoo 偶尔拒绝裸客户端
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`yahoo chart ${symbol} HTTP ${res.status}`);
  const json: unknown = await res.json();
  const meta = (json as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } }).chart?.result?.[0]?.meta;
  if (!meta) return null;
  const price = typeof meta['regularMarketPrice'] === 'number' ? meta['regularMarketPrice'] : null;
  // Prefer `previousClose` (true prior-session close) for the day change; fall back to / 优先 previousClose(真实上一交易日收盘)算日涨跌;回退到
  // `chartPreviousClose` (range-relative) only if it's missing. / chartPreviousClose(随图表区间)仅当缺省时
  const prev =
    typeof meta['previousClose'] === 'number'
      ? meta['previousClose']
      : typeof meta['chartPreviousClose'] === 'number'
        ? meta['chartPreviousClose']
        : null;
  if (price === null) return null;
  const changePercent = prev && prev !== 0 ? ((price - prev) / prev) * 100 : 0;
  return { symbol, code, name, price, changePercent };
}

// Fetch each symbol independently; one failure drops only that row, never the whole refresh. / 逐符号独立取数,单个失败只丢该行,不拖垮整次刷新
export async function fetchQuotes(
  items: ReadonlyArray<{ symbol: string; code: string; name: string }>,
): Promise<Quote[]> {
  if (items.length === 0) return [];
  const results = await Promise.all(items.map((it) => fetchOne(it.symbol, it.code, it.name).catch(() => null)));
  return results.filter((q): q is Quote => q !== null);
}
