// Minimal HTTP brick server: SSE stream (GET /events) + action sink (POST /action). / 最小 HTTP 积木服务:SSE 流 + 动作接收
// Keeps a small history so reconnecting clients resume from Last-Event-Id with no gaps. / 保留小历史,重连客户端据 Last-Event-Id 无缝续传
// (Same shape as the mock brick's server — a brick is intentionally writable in ~20 lines.) / 与 mock 积木 server 同形——积木刻意 ~20 行可写
import http from 'node:http';
import { ACTION_PATH, SSE_PATH, SSE_SIGNAL_EVENT, type ActionFrame, type Signal } from '@isle/protocol';

export interface BrickServer {
  // Emit a signal to all connected clients (assigns the next event id). / 向所有客户端推 signal(分配下一个事件 id)
  broadcast: (signal: Signal) => void;
  close: () => void;
}

export interface BrickServerOpts {
  port: number;
  onAction?: (frame: ActionFrame) => void;
  historyLimit?: number;
}

export function createBrickServer(opts: BrickServerOpts): BrickServer {
  const clients = new Set<http.ServerResponse>();
  const history: Array<{ id: number; chunk: string }> = [];
  const limit = opts.historyLimit ?? 200;
  let seq = 0;
  // Most recent frame = current state, replayed to any fresh subscriber. / 最近一帧=当前状态,回放给任何新订阅者
  let latest: string | null = null;

  const formatChunk = (id: number, signal: Signal): string =>
    `id: ${id}\nevent: ${SSE_SIGNAL_EVENT}\ndata: ${JSON.stringify(signal)}\n\n`;

  const broadcast = (signal: Signal): void => {
    const id = ++seq;
    const chunk = formatChunk(id, signal);
    latest = chunk;
    history.push({ id, chunk });
    if (history.length > limit) history.shift();
    for (const res of clients) res.write(chunk);
  };

  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';

    // --- SSE long stream / SSE 长流 ---
    if (req.method === 'GET' && url.startsWith(SSE_PATH)) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(': connected\n\n'); // open the stream / 开流

      const lastId = Number(req.headers['last-event-id']);
      if (Number.isFinite(lastId)) {
        // Resume: replay any frames newer than the client's Last-Event-Id. / 续传:重放比 Last-Event-Id 更新的帧
        for (const h of history) if (h.id > lastId) res.write(h.chunk);
      } else if (latest !== null) {
        // Fresh connect: deliver current state so the host renders immediately. / 新连接:立即给当前状态,让 host 即刻渲染
        res.write(latest);
      }

      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // --- Action sink / 动作接收 ---
    if (req.method === 'POST' && url.startsWith(ACTION_PATH)) {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          const frame = JSON.parse(body) as ActionFrame;
          opts.onAction?.(frame);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end('{"ok":false}');
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(opts.port);

  return {
    broadcast,
    close: () => {
      for (const res of clients) res.end();
      clients.clear();
      server.close();
    },
  };
}
