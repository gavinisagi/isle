// Parse holdings from the Obsidian vault JSON (Q21): { holdings: [{ code, name, type, quantity, cost, ... }] }. / 从 Obsidian vault JSON 解析持仓(Q21)
// Brick DOMAIN logic — the host never sees holdings, only the resulting `metrics`. / 积木领域逻辑,host 永不见持仓,只见产出的 metrics
import { readFile } from 'node:fs/promises';

export interface Holding {
  // Ticker / asset code (e.g. AAPL, BTC). / 标的代码(如 AAPL、BTC)
  code: string;
  // Display name, may be Chinese (e.g. 苹果). Falls back to code. / 显示名,可中文(如 苹果),缺省回退 code
  name: string;
  // e.g. 股票 / 加密 — drives the Yahoo symbol mapping. / 如 股票 / 加密,驱动 Yahoo 符号映射
  type: string;
  quantity: number | null;
  cost: number | null;
}

export async function readHoldings(path: string): Promise<Holding[]> {
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  const raw = (parsed as { holdings?: unknown }).holdings;
  if (!Array.isArray(raw)) return [];
  const out: Holding[] = [];
  for (const r of raw) {
    if (typeof r !== 'object' || r === null) continue;
    const h = r as Record<string, unknown>;
    const code = typeof h['code'] === 'string' ? h['code'] : null;
    if (!code) continue;
    out.push({
      code,
      name: typeof h['name'] === 'string' && h['name'] ? h['name'] : code,
      type: typeof h['type'] === 'string' ? h['type'] : '',
      quantity: typeof h['quantity'] === 'number' ? h['quantity'] : null,
      cost: typeof h['cost'] === 'number' ? h['cost'] : null,
    });
  }
  return out;
}
