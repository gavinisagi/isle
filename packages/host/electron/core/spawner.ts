// Host-managed lifecycle for LOCAL bricks declared via manifest `launch` (Q16 ①). / 据 manifest `launch` 托管本地 brick 生命周期(Q16 ①)
// Spawn on discovery, kill on remove / host exit. / 发现即 spawn,移除 / host 退出即 kill。
// Trust boundary: LOCAL / self-authored packages only — public download/marketplace is explicitly / 信任边界:仅本地 / 自写 package——公开下载 / marketplace 明确
// out of scope (Q16 ③), so the launch command is treated as trusted (no shell, argv-split). / 在范围外(Q16 ③),故 launch 命令视为可信(不走 shell,argv 拆分)
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import type { Manifest } from '@isle/protocol';
import { PLUGINS_DIR } from './registry.js';

// id → the child process we own. / id → 我们托管的子进程
const procs = new Map<string, ChildProcess>();

// Split a launch command line into argv. Self-authored bricks use simple, space-free paths. / 把 launch 命令行拆成 argv;自写 brick 用简单、无空格路径
function splitCommand(cmd: string): string[] {
  return cmd.trim().split(/\s+/).filter(Boolean);
}

// Spawn the brick if it declares `launch` and isn't already running (idempotent across manifest re-reads). / 若声明 launch 且未在运行则 spawn(对 manifest 重读幂等)
// `env` carries the host-injected ISLE_CFG_* config (Q16 ②); empty until config wiring lands. / env 携带 host 注入的 ISLE_CFG_* 配置(Q16 ②);配置链路落地前为空
export function ensureSpawned(manifest: Manifest, env: Record<string, string> = {}): void {
  if (!manifest.launch) return; // no launch → manual start, host doesn't manage it / 无 launch→手动起,host 不托管
  if (procs.has(manifest.id)) return; // already managed / 已托管
  const argv = splitCommand(manifest.launch);
  const command = argv[0];
  if (!command) return; // empty launch → nothing to start / 空 launch→无可启动
  const args = argv.slice(1);
  // brick is self-contained in its plugin dir; launch paths resolve relative to it. / brick 自包含于其插件目录,launch 相对路径据此解析
  const cwd = join(PLUGINS_DIR, manifest.id);
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'ignore',
    windowsHide: true,
  });
  procs.set(manifest.id, child);
  child.on('exit', (code) => {
    // Drop our handle once it exits so a later upsert can respawn. / 退出即丢句柄,后续 upsert 可重启
    if (procs.get(manifest.id) === child) procs.delete(manifest.id);
    if (code) console.error(`[spawn] ${manifest.id} exited with code ${code} / 退出码 ${code}`);
  });
  child.on('error', (err) => {
    // Spawn failure (e.g. command not found) must never crash the host. / spawn 失败(如命令找不到)绝不崩 host
    console.error(`[spawn] ${manifest.id} failed to start / 启动失败:`, err);
    if (procs.get(manifest.id) === child) procs.delete(manifest.id);
  });
}

// Kill a managed brick (its manifest was removed). / kill 一个已托管 brick(其 manifest 被移除)
export function killSpawned(id: string): void {
  const child = procs.get(id);
  if (!child) return;
  procs.delete(id);
  child.kill();
}

// Kill all managed bricks on host exit. / host 退出时 kill 所有已托管 brick
export function killAllSpawned(): void {
  for (const child of procs.values()) child.kill();
  procs.clear();
}
