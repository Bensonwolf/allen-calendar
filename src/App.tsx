import { useEffect, useRef } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { STORAGE_KEY } from './lib/storage';
import CalendarPage from './pages/CalendarPage';
import CompletedPage from './pages/CompletedPage';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/SettingsPage';
import TasksPage from './pages/TasksPage';
import { useAppStore } from './store';
import { useUI } from './store/uiStore';

/** 處理與畫面無關的全域副作用：主題、儲存錯誤提示、跨分頁同步。 */
function useAppEffects() {
  const theme = useAppStore((s) => s.settings.theme);
  const saveErrorCount = useAppStore((s) => s.saveErrorCount);
  const reportedLoad = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (reportedLoad.current) return;
    reportedLoad.current = true;
    const status = useAppStore.getState().loadStatus;
    if (status === 'corrupt') {
      useUI.getState().toast('先前儲存的資料已損壞，已另存備份並以空白資料啟動', 'error');
    } else if (status === 'unavailable') {
      useUI.getState().toast('瀏覽器無法使用本機儲存空間，這次的資料不會被保存', 'error');
    }
  }, []);

  useEffect(() => {
    if (saveErrorCount > 0) useUI.getState().toast('資料儲存失敗，請匯出備份並檢查瀏覽器儲存空間', 'error');
  }, [saveErrorCount]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) useAppStore.getState().reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}

export default function App() {
  useAppEffects();

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="completed" element={<CompletedPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
