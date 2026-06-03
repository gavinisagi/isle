// Persist the island's position + pin to ~/.island/window-state.json. / 把岛的位置+pin 持久化到 ~/.island/window-state.json
// This is window state, NOT layout config (see DESIGN Q11): config stays layout-only (Q8). / 这是窗口状态,非 layout 配置:config 仍只管 layout
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { WindowState } from '../../shared/types.js';

export const WINDOW_STATE_PATH = join(homedir(), '.island', 'window-state.json');

// Read + validate, or null when absent/corrupt (never throws — a bad file just means "no saved state"). / 读取并校验,缺失/损坏返回 null(不抛,坏文件即视为无状态)
export function loadWindowState(): WindowState | null {
  try {
    if (!existsSync(WINDOW_STATE_PATH)) return null;
    const raw: unknown = JSON.parse(readFileSync(WINDOW_STATE_PATH, 'utf8'));
    if (typeof raw !== 'object' || raw === null) return null;
    const { x, y, placed, pinned } = raw as Record<string, unknown>;
    if (typeof x !== 'number' || typeof y !== 'number') return null;
    return { x, y, placed: Boolean(placed), pinned: Boolean(pinned) };
  } catch {
    return null; // corrupt JSON → ignore / 坏 JSON 忽略
  }
}

// Best-effort persist; failure to write must never crash the island. / 尽力持久化,写失败绝不崩岛
export function saveWindowState(state: WindowState): void {
  try {
    mkdirSync(dirname(WINDOW_STATE_PATH), { recursive: true });
    writeFileSync(WINDOW_STATE_PATH, JSON.stringify(state, null, 2));
  } catch {
    /* ignore write errors / 忽略写错误 */
  }
}
