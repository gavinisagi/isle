// Flat ESLint config shared by all workspaces (ESLint 9). / 全工作区共享的扁平 ESLint 配置(ESLint 9)
// Each package runs `eslint` from its own dir; ESLint searches up and finds this root config. / 各包在自身目录运行 eslint,向上搜索命中本根配置
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  // Never lint build output or deps. / 不 lint 构建产物与依赖
  {
    ignores: ['**/dist/**', '**/dist-electron/**', '**/node_modules/**', '**/*.d.ts'],
  },

  // Base: JS + TS recommended (no type-checking, fast). / 基线:JS+TS 推荐(不做类型检查,快)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // Allow intentionally-unused args/vars when prefixed with _. / 允许下划线前缀的有意未用参数/变量
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Diagnostics are fine; data logging is not (overridden off in the mock CLI). / 诊断日志可,数据日志否(mock CLI 下整体关闭)
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // Node contexts: main process, preload, shared, mock brick, config files. / Node 上下文:主进程、preload、shared、mock、配置
  {
    files: [
      '**/electron/**/*.ts',
      '**/preload/**/*.ts',
      '**/shared/**/*.ts',
      '**/mock-brick/**/*.ts',
      '**/*.config.{ts,mjs,js}',
    ],
    languageOptions: { globals: { ...globals.node } },
  },

  // Renderer context: browser globals + React hooks rules. / renderer 上下文:浏览器全局 + React hooks 规则
  {
    files: ['**/host/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  // The mock brick is a CLI — console IS its output. / mock 积木是 CLI,console 就是它的输出
  {
    files: ['**/mock-brick/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
);
