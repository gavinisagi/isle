// The normalized Signal bus: aggregates {manifest, connState, lastSignal} per brick → immutable snapshots. / 归一化 Signal bus:按 brick 聚合 → 不可变快照
// Owns each brick's SseClient lifecycle. Stale is DERIVED from manifest heartbeat, never hard-coded. / 持有各 brick 的 SseClient 生命周期;stale 据 manifest heartbeat 推导,不硬编码
import { isStale, type ConnState, type Manifest, type Signal } from '@isle/protocol';
import type { BrickView, BusSnapshot } from '../../shared/types.js';
import { SseClient } from './sse-client.js';

interface Runtime {
  manifest: Manifest;
  connState: ConnState;
  lastSignal: Signal | null;
  lastSeenTs: number | null;
  client: SseClient;
}

// Re-derive stale on this cadence even when no new signals arrive. / 即使无新 signal 也按此节奏重判 stale
const STALE_TICK_MS = 2000;

export class Bus {
  private readonly bricks = new Map<string, Runtime>();
  private listener: ((snapshot: BusSnapshot) => void) | null = null;
  private staleTimer: NodeJS.Timeout | null = null;

  onSnapshot(cb: (snapshot: BusSnapshot) => void): void {
    this.listener = cb;
  }

  // Add a newly discovered brick, or update an existing one's manifest. / 新增发现的 brick,或更新已有 brick 的 manifest
  upsertManifest(manifest: Manifest): void {
    const existing = this.bricks.get(manifest.id);
    if (existing) {
      const portChanged = existing.manifest.port !== manifest.port;
      existing.manifest = manifest;
      if (portChanged) {
        // reconnect against the new port / 按新端口重连
        existing.client.stop();
        existing.client = this.makeClient(manifest);
        existing.client.start();
      }
      this.emit();
      return;
    }

    const rt: Runtime = {
      manifest,
      connState: 'discovered',
      lastSignal: null,
      lastSeenTs: null,
      // placeholder; replaced immediately below / 占位,下面立即替换
      client: null as unknown as SseClient,
    };
    rt.client = this.makeClient(manifest);
    this.bricks.set(manifest.id, rt);
    rt.client.start();
    this.emit();
  }

  private makeClient(manifest: Manifest): SseClient {
    return new SseClient(manifest, {
      onState: (state) => {
        const rt = this.bricks.get(manifest.id);
        if (!rt) return;
        rt.connState = state;
        this.emit();
      },
      onSignal: (signal) => {
        const rt = this.bricks.get(manifest.id);
        if (!rt) return;
        rt.lastSignal = signal;
        rt.lastSeenTs = Date.now();
        rt.connState = 'connected';
        this.emit();
      },
    });
  }

  // A removed manifest stops the stream but the host may still show last-known until cleared. / 移除 manifest 停流,host 可能仍显示 last-known 直至清除
  removeManifest(id: string): void {
    const rt = this.bricks.get(id);
    if (!rt) return;
    rt.client.stop();
    this.bricks.delete(id);
    this.emit();
  }

  getManifest(id: string): Manifest | undefined {
    return this.bricks.get(id)?.manifest;
  }

  // Build the current immutable snapshot, deriving stale from heartbeat. / 构建当前不可变快照,据 heartbeat 推导 stale
  snapshot(): BusSnapshot {
    const now = Date.now();
    const bricks: BrickView[] = [...this.bricks.values()].map((rt) => {
      let connState = rt.connState;
      // Only a live-but-silent brick goes stale; disconnected stays disconnected. / 仅"在线但沉默"判 stale,断连仍为断连
      if (connState === 'connected' && rt.lastSeenTs !== null && isStale(rt.lastSeenTs, rt.manifest.heartbeat, now)) {
        connState = 'stale';
      }
      return {
        manifest: rt.manifest,
        connState,
        lastSignal: rt.lastSignal,
        lastSeenTs: rt.lastSeenTs,
      };
    });
    return { bricks };
  }

  // Periodic re-emit so derived stale surfaces without a triggering signal. / 周期重发,让派生 stale 无需触发信号即可显现
  startStaleTimer(): void {
    if (this.staleTimer) return;
    this.staleTimer = setInterval(() => this.emit(), STALE_TICK_MS);
  }

  stop(): void {
    if (this.staleTimer) clearInterval(this.staleTimer);
    this.staleTimer = null;
    for (const rt of this.bricks.values()) rt.client.stop();
    this.bricks.clear();
  }

  private emit(): void {
    this.listener?.(this.snapshot());
  }
}
