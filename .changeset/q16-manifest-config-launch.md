---
"@isle/protocol": minor
---

feat(protocol): manifest gains `config` and activates host-managed `launch` (Q16). `config` is a brick-declared, domain-blind config schema (`{ key, label, type ∈ string|number|secret, default? }[]`) the host renders as a generic form — values persist to `~/.island/plugins/<id>/config.json` and inject as `ISLE_CFG_<KEY>` env on spawn; `launch` is now a host-managed spawn of a LOCAL brick (was reserved). Both are backward-compatible optional fields; signal/action data frames are unchanged. Public package download / marketplace stays out of scope. / manifest 新增 `config` 并启用 host 托管的 `launch`(Q16)。`config` 是 brick 声明、host 域无知渲染的配置 schema(`{ key, label, type ∈ string|number|secret, default? }[]`),值存 `~/.island/plugins/<id>/config.json`、spawn 时作 `ISLE_CFG_<KEY>` 注入;`launch` 现为 host 托管本地 brick 启动(原为预留)。两者均为向后兼容的可选字段,signal/action 数据帧不变。公开 package 下载/marketplace 仍在范围外。
