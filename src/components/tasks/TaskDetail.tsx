import { AlignLeft, CalendarDays, CheckCircle2, Flag, Pencil, Tag, Trash2, Undo2 } from 'lucide-react';
import { useEffect } from 'react';
import { useTaskActions } from '../../hooks/useActions';
import { useNow } from '../../hooks/useNow';
import { formatClock, formatDayLabel, formatMonthDay, timestampToDateKey, toDateKey } from '../../lib/date';
import { OTHER_CATEGORY_ID } from '../../lib/defaults';
import { isOverdue } from '../../lib/tasks';
import { useAppStore } from '../../store';
import { useUI } from '../../store/uiStore';
import { Modal } from '../ui/Modal';
import { PriorityBadge, TaskCheckbox } from '../ui/primitives';

/** 任務細節（唯讀）。要修改時再按「編輯」。 */
export function TaskDetailHost() {
  const id = useUI((s) => s.taskDetailId);
  const close = useUI((s) => s.closeTaskDetail);
  const task = useAppStore((s) => (id ? s.tasks.find((t) => t.id === id) : undefined));
  const categories = useAppStore((s) => s.categories);
  const actions = useTaskActions();
  const now = useNow();

  // 任務在別處被刪除時自動關閉
  useEffect(() => {
    if (id && !task) close();
  }, [id, task, close]);

  if (!id || !task) return null;

  const today = toDateKey(now);
  const done = task.status === 'completed';
  const overdue = isOverdue(task, now);
  const category = categories.find((c) => c.id === task.categoryId) ?? categories.find((c) => c.id === OTHER_CATEGORY_ID);

  let dueText = '未指定日期';
  if (task.dueDate) {
    const relative = formatDayLabel(task.dueDate, today);
    const full = formatMonthDay(task.dueDate);
    dueText = [relative === full ? full : `${full}（${relative}）`, task.dueTime].filter(Boolean).join(' ');
  }

  const stamp = (iso: string) => `${formatDayLabel(timestampToDateKey(iso), today)} ${formatClock(iso)}`;

  return (
    <Modal
      title="任務細節"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-ghost mr-auto hover:text-red-500" onClick={() => actions.remove(task, close)}>
            <Trash2 size={15} />
            刪除
          </button>
          <button type="button" className="btn btn-outline" onClick={() => actions.toggle(task)}>
            {done ? <Undo2 size={15} /> : <CheckCircle2 size={15} />}
            {done ? '移回要做' : '標記完成'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => actions.edit(task)}>
            <Pencil size={15} />
            編輯
          </button>
        </>
      }
    >
      <div className="space-y-3 pb-2">
        <div className="flex items-start gap-2">
          <TaskCheckbox
            checked={done}
            onChange={() => actions.toggle(task)}
            label={done ? `取消完成：${task.title}` : `完成：${task.title}`}
          />
          <div className="min-w-0 flex-1 pt-1.5">
            <h3 className={`break-words text-lg font-semibold leading-snug ${done ? 'text-faint line-through' : ''}`}>{task.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                  done ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-surface2 text-muted'
                }`}
              >
                {done ? '已完成' : '要做'}
              </span>
              {overdue && (
                <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">已逾期</span>
              )}
            </div>
          </div>
        </div>

        <dl className="space-y-2.5 pl-1 text-sm">
          <div className="flex items-start gap-3">
            <CalendarDays size={16} className="mt-0.5 shrink-0 text-faint" />
            <dd className={overdue ? 'font-medium text-red-500' : task.dueDate ? '' : 'text-faint'}>{dueText}</dd>
          </div>
          <div className="flex items-center gap-3">
            <Flag size={16} className="shrink-0 text-faint" />
            <dd>
              <PriorityBadge priority={task.priority} />
            </dd>
          </div>
          {category && (
            <div className="flex items-center gap-3">
              <Tag size={16} className="shrink-0 text-faint" />
              <dd className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                {category.name}
              </dd>
            </div>
          )}
          <div className="flex items-start gap-3">
            <AlignLeft size={16} className="mt-0.5 shrink-0 text-faint" />
            <dd className={`min-w-0 whitespace-pre-wrap break-words ${task.description ? 'text-muted' : 'text-faint'}`}>
              {task.description || '沒有描述'}
            </dd>
          </div>
        </dl>

        <p className="border-t border-line pt-3 text-xs text-faint">
          建立於 {stamp(task.createdAt)}
          {done && task.completedAt && `・完成於 ${stamp(task.completedAt)}`}
        </p>
      </div>
    </Modal>
  );
}
