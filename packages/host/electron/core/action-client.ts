// host → brick: POST /action. Fire-and-forget; a dead brick must never crash the host. / host→brick:POST /action,发后不管,死 brick 绝不崩 host
import http from 'node:http';
import { ACTION_PATH, type ActionFrame } from '@isle/protocol';

export function postAction(port: number, frame: ActionFrame): void {
  const body = JSON.stringify(frame);
  const req = http.request(
    {
      host: '127.0.0.1',
      port,
      path: ACTION_PATH,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    },
    (res) => res.resume(), // drain + discard response / 排空并丢弃响应
  );
  req.on('error', () => {
    /* brick offline → ignore / brick 离线则忽略 */
  });
  req.write(body);
  req.end();
}
