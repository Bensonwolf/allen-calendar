import { Inbox, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QuickAdd } from '../components/tasks/QuickAdd';
import { TaskItem } from '../components/tasks/TaskItem';
import { EmptyState, PageHeader } from '../components/ui/primitives';
import { useNow } from '../hooks/useNow';
import { addDaysKey, toDateKey } from '../lib/date';
import {
  FILTER_LABEL,
  PRIORITIES,
  PRIORITY_LABEL,
  filterTasks,
  sortTasks,
  type TaskFilter,
  type TaskSort,
} from '../lib/tasks';
import { useAppStore } from '../store';
import { useUI } from '../store/uiStore';
import type { Priority } from '../types';

const FILTERS: TaskFilter[] = ['all', 'today', 'tomorrow', 'next7', 'overdue', 'completed'];

const EMPTY_TEXT: Record<TaskFilter, string> = {
  all: '還沒有任何任務',
  today: '今天沒有待辦事項',
  tomorrow: '明天沒有待辦事項',
  next7: '未來 7 天沒有待辦事項',
  overdue: '沒有逾期的任務，保持下去',
  completed: '還沒有已完成的任務',
};

function isFilter(value: string | null): value is TaskFilter {
  return !!value && (FILTERS as string[]).includes(value);
}

export default function TasksPage() {
  const now = useNow();
  const today = toDateKey(now);
  const tasks = useAppStore((s) => s.tasks);
  const categories = useAppStore((s) => s.categories);
  const showCompleted = useAppStore((s) => s.settings.showCompleted);
  const openTaskForm = useUI((s) => s.openTaskForm);

  const [params, setParams] = useSearchParams();
  const rawFilter = params.get('filter');
  const filter: TaskFilter = isFilter(rawFilter) ? rawFilter : 'all';
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [sort, setSort] = useState<TaskSort>('priority');

  // 目前選的分類被刪除時，視為沒有篩選
  const activeCategory = categories.some((c) => c.id === categoryId) ? categoryId : '';

  const counts = useMemo(() => {
    const result = {} as Record<TaskFilter, number>;
    for (const f of FILTERS) {
      // 數字代表「還要做的」；只有「已完成」分頁計算已完成的數量
      result[f] = filterTasks(tasks, { filter: f, showCompleted: false }, now).length;
    }
    return result;
  }, [tasks, now]);

  const visible = useMemo(
    () =>
      sortTasks(
        filterTasks(tasks, { filter, categoryId: activeCategory || null, priority: priority || null, showCompleted }, now),
        sort,
      ),
    [tasks, filter, activeCategory, priority, showCompleted, sort, now],
  );

  const quickAddDate = filter === 'tomorrow' ? addDaysKey(today, 1) : today;
  const hasExtraFilter = !!activeCategory || !!priority;

  return (
    <div>
      <PageHeader
        title="待辦事項"
        subtitle={`共 ${counts.all} 件待完成${counts.overdue > 0 ? `，其中 ${counts.overdue} 件已逾期` : ''}`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openTaskForm({ dueDate: quickAddDate })}>
            <Plus size={16} />
            新增任務
          </button>
        }
      />

      <div className="card p-3 sm:p-4">
        {filter !== 'completed' && filter !== 'overdue' && (
          <div className="pb-3">
            <QuickAdd
              date={quickAddDate}
              placeholder={filter === 'tomorrow' ? '快速新增明天的任務，按 Enter 送出' : '快速新增今天的任務，按 Enter 送出'}
            />
          </div>
        )}

        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-3" role="tablist" aria-label="任務篩選">
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setParams(f === 'all' ? {} : { filter: f }, { replace: true })}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                  active ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface2 hover:text-ink'
                }`}
              >
                {FILTER_LABEL[f]}
                <span
                  className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                    f === 'overdue' && counts[f] > 0 ? 'bg-red-500/10 text-red-600 dark:text-red-400' : active ? 'bg-surface text-primary' : 'bg-surface2 text-faint'
                  }`}
                >
                  {counts[f]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 sm:flex sm:flex-wrap">
          <select className="input sm:w-40" value={activeCategory} onChange={(e) => setCategoryId(e.target.value)} aria-label="依分類篩選">
            <option value="">所有分類</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="input sm:w-40" value={priority} onChange={(e) => setPriority(e.target.value as Priority | '')} aria-label="依優先級篩選">
            <option value="">所有優先級</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}優先級
              </option>
            ))}
          </select>
          <select className="input sm:ml-auto sm:w-44" value={sort} onChange={(e) => setSort(e.target.value as TaskSort)} aria-label="排序方式">
            <option value="priority">依優先級排序</option>
            <option value="dueDate">依截止日期排序</option>
            <option value="createdAt">依建立時間排序</option>
          </select>
        </div>

        <div className="mt-2">
          {visible.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={hasExtraFilter ? '沒有符合篩選條件的任務' : EMPTY_TEXT[filter]}
              hint={hasExtraFilter ? undefined : filter === 'all' ? '在上方輸入任務名稱，或按 N 鍵快速新增' : undefined}
              action={
                hasExtraFilter ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setCategoryId('');
                      setPriority('');
                    }}
                  >
                    清除篩選
                  </button>
                ) : undefined
              }
            />
          ) : (
            <ul>
              {visible.map((t) => (
                <TaskItem key={t.id} task={t} now={now} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
