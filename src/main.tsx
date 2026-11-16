import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { useAppStore } from './store';

// 在第一次繪製前套用主題，避免深色模式閃一下白色
document.documentElement.classList.toggle('dark', useAppStore.getState().settings.theme === 'dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
