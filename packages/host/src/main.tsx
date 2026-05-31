// Renderer entry: mount React. / renderer 入口:挂载 React
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('root element missing / 缺少 root 元素');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
