// Fetch quotes from Yahoo Finance (Q17). Uses the public quote endpoint; an optional API key / 从 Yahoo Finance 取行情(Q17),用公开 quote 端点;可选 API key
// (ISLE_CFG_YFINANCEKEY) is forwarded as a bearer header when present, for gateways that require it. / (ISLE_CFG_YFINANCEKEY)存在时作 bearer 头转发,供需要它的网关
// NOTE: Yahoo's endpoint shape/auth shifts over time — adjust here without touching the host. / 注:Yahoo 端点形态/鉴权会变,改这里即可,不动 host。Brick DOMAIN logic. / 积木领域逻辑
export interface Quote {
  symbol: string;
  price: number;
  // Day change percentage (e.g. +1.8 → up 1.8%). / 当日涨跌百分比(如 +1.8 → 涨 1.8%)
  changePercent: number;
}

export async function fetchQuotes(symbols: string[], apiKey?: string): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
  const headers: Record<string, string> = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`yahoo quote HTTP ${res.status}`);
  const json: unknown = await res.json();

  const rows = (json as { quoteResponse?: { result?: unknown[] } }).quoteResponse?.result ?? [];
  const out: Quote[] = [];
  for (const r of rows) {
    if (typeof r !== 'object' || r === null) continue;
    const q = r as Record<string, unknown>;
    const symbol = typeof q['symbol'] === 'string' ? q['symbol'] : null;
    const price = typeof q['regularMarketPrice'] === 'number' ? q['regularMarketPrice'] : null;
    const changePercent = typeof q['regularMarketChangePercent'] === 'number' ? q['regularMarketChangePercent'] : 0;
    if (symbol && price !== null) out.push({ symbol, price, changePercent });
  }
  return out;
}
