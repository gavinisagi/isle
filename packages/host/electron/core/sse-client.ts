// One long-lived SSE stream per brick. Reconnects with exponential backoff, resumes via Last-Event-Id. / 每 brick 一条 SSE 长流,指数退避重连,据 Last-Event-Id 续传
// Every frame is validated by parseSignal at this ingest boundary; bad frames are dropped, never crash. / 每帧在此 ingest 边界经 parseSignal 校验,坏帧丢弃绝不崩
import http from 'node:http';
import { DEFAULT_HEARTBEAT_MS, SSE_PATH, SSE_SIGNAL_EVENT, parseSignal, type ConnState, type Manifest, type Signal } from '@isle/protocol';

export interface SseCallbacks {
  onState: (state: ConnState) => void;
  onSignal: (signal: Signal) => void;
}

const MAX_BACKOFF_MS = 15_000;

export class SseClient {
  private req: http.ClientRequest | null = null;
  private buffer = '';
  private lastEventId: string | null = null;
  private retry = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private closed = false;

  constructor(
    private readonly manifest: Manifest,
    private readonly cb: SseCallbacks,
  ) {}

  start(): void {
    this.closed = false;
    this.connect();
  }

  stop(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.req?.destroy();
    this.req = null;
  }

  private connect(): void {
    this.reconnectTimer = null;
    this.cb.onState('connecting');

    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    // Resume from where we left off so a dropped stream loses no data. / 从断点续传,断流不丢数据
    if (this.lastEventId !== null) headers['Last-Event-Id'] = this.lastEventId;

    const req = http.get(
      { host: '127.0.0.1', port: this.manifest.port, path: SSE_PATH, headers },
      (res) => {
        // Response headers arrived → disable the connect-phase timeout. / 响应头已到,关闭连接阶段超时
        // A healthy SSE stream is intentionally idle between signals; never time that out. / 健康 SSE 流两帧间本就静默,绝不为此超时
        req.setTimeout(0);
        if (res.statusCode !== 200) {
          res.destroy();
          this.scheduleReconnect();
          return;
        }
        this.retry = 0; // healthy connection resets backoff / 健康连接重置退避
        this.cb.onState('connected');
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => this.onChunk(chunk));
        res.on('end', () => this.scheduleReconnect());
        res.on('close', () => this.scheduleReconnect());
        res.on('error', () => this.scheduleReconnect());
      },
    );
    req.on('error', () => this.scheduleReconnect());
    // Guard ONLY the connect/response phase: a brick that accepts the socket but never sends / 仅守连接/响应阶段:brick 收了 socket 却始终不回响应头
    // response headers would otherwise hang in 'connecting' forever. Tear down and retry. / 否则会永远卡在 connecting;此处拆除重试
    // Derived from the manifest heartbeat (conservative default), never a hard-coded threshold. / 据 manifest heartbeat 推导(保守默认),非硬编码阈值
    req.setTimeout(this.connectTimeoutMs(), () => {
      req.destroy();
      this.scheduleReconnect();
    });
    this.req = req;
  }

  // Upper bound for receiving response headers, derived from the brick's declared cadence. / 接收响应头的时限,据 brick 声明的节奏推导
  private connectTimeoutMs(): number {
    const hb = this.manifest.heartbeat;
    return hb && hb > 0 ? hb : DEFAULT_HEARTBEAT_MS;
  }

  // Split the SSE byte stream on blank lines into events. / 按空行把 SSE 字节流切成事件
  private onChunk(chunk: string): void {
    this.buffer += chunk;
    let idx: number;
    while ((idx = this.buffer.indexOf('\n\n')) !== -1) {
      const raw = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      this.parseEvent(raw);
    }
  }

  private parseEvent(raw: string): void {
    let id: string | null = null;
    let event = 'message';
    let data = '';
    for (const line of raw.split('\n')) {
      if (line.startsWith(':')) continue; // comment / 注释
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'id') id = value;
      else if (field === 'event') event = value;
      else if (field === 'data') data += (data ? '\n' : '') + value;
    }
    if (id !== null) this.lastEventId = id; // advance resume cursor / 推进续传游标
    if (!data || (event !== SSE_SIGNAL_EVENT && event !== 'message')) return;

    try {
      const signal = parseSignal(JSON.parse(data));
      if (signal) this.cb.onSignal(signal);
      // invalid shape → silently dropped / 形状非法则静默丢弃
    } catch {
      /* malformed JSON → drop / 坏 JSON 丢弃 */
    }
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return; // de-dupe end+close+error / 去重 end+close+error
    this.req = null;
    this.cb.onState('disconnected');
    const delay = Math.min(1000 * 2 ** this.retry, MAX_BACKOFF_MS);
    this.retry += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
