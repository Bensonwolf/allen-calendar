import { CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { TaskItem } from '../components/tasks/TaskItem';
import { EmptyState, PageHeader } from '../components/ui/primitives';
import { useNow } from '../hooks/useNow';
import { formatDayLabel, timestampToDateKey, toDateKey } from '../lib/date';
import { useAppStore } from '../store';
import type { DateKey, Task } from '../types';

export default function CompletedPage() {
  const now = useNow();
  const today = toDateKey(now);
  const tasks = useAppStore((s) => s.tasks);

  // 依「完成當天的本地日期」分組，最近完成的在最上面
  const groups = useMemo(() => {
    const done = tasks
      .filter((t) => t.status === 'completed')
      .sort((a, b) => ((a.completedAt ?? '') < (b.completedAt ?? '') ? 1 : -1));
    const map = new Map<DateKey, Task[]>();
    for (const t of done) {
      const key = timestampToDateKey(t.completedAt ?? t.updatedAt);
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return [...map.entries()];
  }, [tasks]);

  const total = groups.reduce((sum, [, list]) => sum + list.length, 0);

  return (
    <div>
      <PageHeader title="已完成" subtitle={total > 0 ? `共完成 ${total} 件任務` : '完成的任務會收在這裡'} />
      {groups.length === 0 ? (
        <div className="card">
          <EmptyState icon={CheckCircle2} title="還沒有已完成的任務" hint="勾選任務後，它會出現在這裡；取消勾選可以移回要做" />
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([date, list]) => (
            <section key={date} className="card p-3 sm:p-4">
              <h2 className="px-2 pb-1 pt-1 text-sm font-semibold">
                {formatDayLabel(date, today)}
                <span className="ml-2 rounded-full bg-surface2 px-2 py-0.5 text-xs font-medium tabular-nums text-muted">{list.length}</span>
              </h2>
              <ul>
                {list.map((t) => (
                  <TaskItem key={t.id} task={t} now={now} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
