// `view` renderer. Mounts brick HTML in a sandboxed iframe — the host NEVER parses the content. / view 渲染器:把 brick HTML 挂进沙箱 iframe,host 绝不解析内容
// Sandbox = allow-scripts only (NO allow-same-origin), so framed scripts can't reach host origin / IPC. / 沙箱仅 allow-scripts(不给 allow-same-origin),框内脚本够不到 host 同源/IPC
// A CSP <meta> is injected into the framed doc, restricting img/connect to local brick ports. / 向框内文档注入 CSP meta,把 img/connect 限到本地 brick 端口
import type { Control } from '@isle/protocol';
import { ControlView } from './ControlView.js';

interface ViewData {
  html: string;
  controls?: Control[];
}

const IFRAME_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; " +
  'img-src http://localhost:* http://127.0.0.1:*; connect-src http://localhost:* http://127.0.0.1:*';

// Force the brick HTML to carry our CSP regardless of what it declares. / 强制为 brick HTML 注入我方 CSP,无论其自身声明
function framedDoc(html: string): string {
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${IFRAME_CSP}">${html}`;
}

export function ViewView({ data, brickId }: { data: ViewData; brickId: string }): JSX.Element {
  return (
    <div className="rk-view">
      <iframe
        title={`view-${brickId}`}
        className="rk-view__frame"
        sandbox="allow-scripts"
        srcDoc={framedDoc(data.html)}
      />
      {data.controls && data.controls.length > 0 && <ControlView controls={data.controls} brickId={brickId} />}
    </div>
  );
}
