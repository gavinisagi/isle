---
---

chore: add a one-command `pnpm dev` that runs the host and mock brick together (via `concurrently`), and record the Docker-out-of-scope decision (Q10) — the GUI host can't run headless in a container. Tooling/docs only, no package version change — empty changeset. / 加 `pnpm dev` 一键并发启动 host+mock(`concurrently`),并记录 Docker 对 GUI host out-of-scope 的决策(Q10)。仅工具/文档,无包版本变更,故空 changeset。
