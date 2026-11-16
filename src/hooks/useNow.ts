import { useEffect, useState } from 'react';

/**
 * 目前時間，每 30 秒與分頁重新顯示時更新。
 * 讓「今天」、逾期標籤與「進行中」在長時間開著網頁（包含跨過午夜）時仍然正確。
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);

  return now;
}
