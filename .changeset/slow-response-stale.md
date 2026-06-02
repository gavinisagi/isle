---
---

fix(host): a connected-but-silent brick now degrades to `stale` (derived from manifest heartbeat, last-known preserved), and the SSE client guards the connect/response phase with a request timeout. Mock gains a `mock-slow` acceptance brick (connects, never pushes). No protocol or public-package change — empty changeset. / 连上但永不推数据的 brick 现据 manifest heartbeat 降级为 `stale`(保留 last-known),SSE 客户端为连接/响应阶段加请求超时;mock 新增 `mock-slow` 验收积木(连上但不推送)。不动协议/公开包,故空 changeset。
