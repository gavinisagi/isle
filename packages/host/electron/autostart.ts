// Launch-on-login registration. v1: simple OS login item, opened hidden (the island shows itself). / 开机自启:v1 用系统登录项,隐藏启动(由岛自行显示)
import { app } from 'electron';

export function setAutoStart(enabled: boolean): void {
  // No-op in dev (electron binary path isn't the installed app). / 开发态跳过(electron 可执行非安装应用)
  if (!app.isPackaged) return;
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
  });
}

export function isAutoStartEnabled(): boolean {
  if (!app.isPackaged) return false;
  return app.getLoginItemSettings().openAtLogin;
}
