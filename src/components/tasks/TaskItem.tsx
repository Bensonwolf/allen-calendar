import { Clock, Pencil, Trash2 } from 'lucide-react';
import { useTaskActions } from '../../hooks/useActions';
import { formatClock, formatDayLabel, timestampToDateKey, toDateKey } from '../../lib/date';
import { OTHER_CATEGORY_ID } from '../../lib/defaults';
import { isOverdue } from '../../lib/tasks';
import { useAppStore } from '../../store';
import type { Task } from '../../types';
import { CategoryTag, PriorityBadge, TaskCheckbox } from '../ui/primitives';

interface TaskItemProps {
  task: Task;
  now: Date;
  /** 清單本身已經限定在某一天時，不重複顯示日期 */
  hideDate?: boolean;
}

export function TaskItem({ task, now, hideDate = false }: TaskItemProps) {
  const actions = useTaskActions();
  const category = useAppStore(
    (s) => s.categories.find((c) => c.id === task.categoryId) ?? s.categories.find((c) => c.id === OTHER_CATEGORY_ID),
  );
  const today = toDateKey(now);
  const done = task.status === 'completed';
  const overdue = isOverdue(task, now);

  let dueText: string | null = null;
  if (task.dueDate) {
    const parts = [hideDate ? null : formatDayLabel(task.dueDate, today), task.dueTime].filter(Boolean);
    dueText = parts.length > 0 ? parts.join(' ') : null;
  }

  let completedText: string | null = null;
  if (done && task.completedAt) {
    const day = timestampToDateKey(task.completedAt);
    completedText = `完成於 ${day === today ? '' : `${formatDayLabel(day, today)} `}${formatClock(task.completedAt)}`;
  }

  return (
    <li className="group flex animate-fade-up items-start gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface2/70">
      <TaskCheckbox
        checked={done}
        onChange={() => actions.toggle(task)}
        label={done ? `取消完成：${task.title}` : `完成：${task.title}`}
      />
      <button type="button" className="min-w-0 flex-1 py-1.5 text-left" onClick={() => actions.open(task)}>
        <span className={`block break-words text-sm leading-snug ${done ? 'text-faint line-through' : 'text-ink'}`}>
          {task.title}
        </span>
        <span className={`mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 ${done ? 'opacity-60' : ''}`}>
          {!done && <PriorityBadge priority={task.priority} />}
          {category && <CategoryTag name={category.name} color={category.color} />}
          {!done && dueText && (
            <span className={`inline-flex items-center gap-1 text-xs ${overdue ? 'font-medium text-red-500' : 'text-muted'}`}>
              <Clock size={12} />
              {dueText}
            </span>
          )}
          {overdue && (
            <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
              已逾期
            </span>
          )}
          {completedText && <span className="text-xs text-faint">{completedText}</span>}
        </span>
      </button>
      <div className="flex shrink-0 items-center opacity-100 transition-opacity md:opacity-0 md:focus-within:opacity-100 md:group-hover:opacity-100">
        <button type="button" className="icon-btn h-10 w-10" onClick={() => actions.edit(task)} aria-label={`編輯：${task.title}`}>
          <Pencil size={20} />
        </button>
        <button
          type="button"
          className="icon-btn h-10 w-10 hover:text-red-500"
          onClick={() => actions.remove(task)}
          aria-label={`刪除：${task.title}`}
        >
          <Trash2 size={20} />
        </button>
      </div>
    </li>
  );
}
