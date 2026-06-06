// Parse holdings from an Obsidian markdown file (Q17). Convention — markdown list lines: / 从 Obsidian markdown 解析持仓(Q17),约定为 markdown 列表行:
//   - TSLA          (ticker only) / 仅 ticker
//   - TSLA: 10      (ticker + shares) / ticker + 份额
// Lines without a leading uppercase ticker are ignored. / 无前导大写 ticker 的行忽略。
// This is the brick's DOMAIN logic — the host never sees holdings, only the resulting `metrics`. / 这是积木的领域逻辑,host 永不见持仓,只见产出的 metrics
import { readFile } from 'node:fs/promises';

export interface Holding {
  symbol: string;
  shares?: number;
}

export async function readHoldings(path: string): Promise<Holding[]> {
  const text = await readFile(path, 'utf8');
  const out: Holding[] = [];
  for (const line of text.split(/\r?\n/)) {
    // `- <TICKER>` optionally followed by `: <shares>` or `= <shares>`. / `- <TICKER>` 可后跟 `: <份额>` 或 `= <份额>`
    const m = /^\s*[-*]\s*([A-Z][A-Z.-]{0,9})\b(?:\s*[:=]\s*(\d+(?:\.\d+)?))?/.exec(line);
    const symbol = m?.[1];
    if (!symbol) continue;
    const sharesRaw = m?.[2];
    out.push(sharesRaw !== undefined ? { symbol, shares: Number(sharesRaw) } : { symbol });
  }
  return out;
}
