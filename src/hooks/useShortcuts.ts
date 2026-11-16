import { useEffect } from 'react';
import { useUI } from '../store/uiStore';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * 全域快捷鍵：
 * - Ctrl/Cmd + K：開啟搜尋
 * - Esc：關閉最上層的視窗
 * - N：快速新增任務（輸入文字或已有視窗開啟時不觸發）
 */
export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ui = useUI.getState();
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && key === 'k') {
        e.preventDefault();
        if (ui.searchOpen) ui.closeSearch();
        else if (!ui.isAnyOpen()) ui.openSearch();
        return;
      }

      if (e.key === 'Escape') {
        // 輸入法選字中按 Esc 是取消選字，不應關閉視窗
        if (e.isComposing) return;
        if (ui.closeTop()) e.preventDefault();
        return;
      }

      if (key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing && !e.repeat) {
        if (isTypingTarget(e.target) || ui.isAnyOpen()) return;
        e.preventDefault();
        ui.openTaskForm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
