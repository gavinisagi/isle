---
---

feat(host): draggable + pinnable island. A drag handle on the expanded card repositions the island (position persisted to `~/.island/window-state.json`; positioning/resize become anchor-aware — no auto-recenter once dragged, only clamped on-screen). A global hotkey (`Ctrl/Cmd+Alt+I`) and an on-island button toggle pin; pinned stays expanded + interactive, and an unpinned island auto-collapses when the mouse leaves. Host-only, no protocol/render-kind change — empty changeset. / 岛可拖动 + 可 pin:展开卡片拖动手柄移动岛(位置存 window-state.json,定位/缩放锚点感知);全局热键 + 岛上按钮切 pin,pin 时保持展开可交互,非 pin 鼠标离开自动收回。仅 host,空 changeset。
