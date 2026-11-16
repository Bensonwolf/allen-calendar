import { Check } from 'lucide-react';
import { getCategoryColor, getEventColor } from '../../lib/events';
import { useUI } from '../../store/uiStore';
import type { CalendarEvent, Category, Task } from '../../types';

/** 行事曆格子裡的行程小標籤。 */
export function EventChip({ event, categories, timeLabel }: { event: CalendarEvent; categories: Category[]; timeLabel?: string | null }) {
  const open = useUI((s) => s.openEventDetail);
  const color = getEventColor(event, categories);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        open(event.id);
      }}
      title={event.title}
      className="flex w-full min-w-0 items-center gap-1 rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] leading-4 text-ink transition-opacity hover:opacity-80"
      style={{ backgroundColor: `${color}26`, borderLeftColor: color }}
    >
      {timeLabel && <span className="shrink-0 tabular-nums text-muted">{timeLabel}</span>}
      <span className="truncate font-medium">{event.title}</span>
    </button>
  );
}

/** 行事曆格子裡的任務小標籤；已完成時顯示勾選與刪除線。 */
export function TaskChip({ task, categories }: { task: Task; categories: Category[] }) {
  const openTaskDetail = useUI((s) => s.openTaskDetail);
  const color = getCategoryColor(task.categoryId, categories);
  const done = task.status === 'completed';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openTaskDetail(task.id);
      }}
      title={task.title}
      className={`flex w-full min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-left text-[11px] leading-4 transition-colors hover:bg-surface2 ${
        done ? 'text-faint' : 'text-ink'
      }`}
    >
      <span
        className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-[1.5px]"
        style={{ borderColor: color, backgroundColor: done ? color : 'transparent' }}
      >
        {done && <Check size={8} strokeWidth={4} className="text-white" />}
      </span>
      <span className={`truncate ${done ? 'line-through' : ''}`}>{task.title}</span>
    </button>
  );
}
