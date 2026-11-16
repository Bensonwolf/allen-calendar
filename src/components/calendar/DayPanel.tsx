import { CalendarPlus } from 'lucide-react';
import { formatDayLabel, formatMonthDay } from '../../lib/date';
import { getEventsOnDay } from '../../lib/events';
import { useUI } from '../../store/uiStore';
import type { CalendarEvent, DateKey, Task } from '../../types';
import { EventRow } from '../events/EventRow';
import { QuickAdd } from '../tasks/QuickAdd';
import { TaskItem } from '../tasks/TaskItem';

interface DayPanelProps {
  date: DateKey;
  today: DateKey;
  now: Date;
  events: CalendarEvent[];
  tasks: Task[];
}

/** 月檢視中，選取日期的完整行程與任務。 */
export function DayPanel({ date, today, now, events, tasks }: DayPanelProps) {
  const openEventForm = useUI((s) => s.openEventForm);
  const dayEvents = getEventsOnDay(events, date);
  const relative = formatDayLabel(date, today);
  const full = formatMonthDay(date);

  return (
    <aside className="card p-3 sm:p-4" aria-label="選取日期的行程與任務">
      <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{full}</h2>
          {relative !== full && <p className="text-xs text-primary">{relative}</p>}
        </div>
        <button type="button" className="btn btn-outline" onClick={() => openEventForm({ date })}>
          <CalendarPlus size={15} />
          新增行程
        </button>
      </div>

      <h3 className="px-2 pb-0.5 pt-2 text-xs font-medium text-muted">行程（{dayEvents.length}）</h3>
      {dayEvents.length === 0 ? (
        <p className="px-2 py-3 text-sm text-faint">這天沒有行程</p>
      ) : (
        <ul>
          {dayEvents.map((e) => (
            <EventRow key={e.id} event={e} day={date} now={now} />
          ))}
        </ul>
      )}

      <h3 className="px-2 pb-0.5 pt-3 text-xs font-medium text-muted">任務（{tasks.length}）</h3>
      {tasks.length === 0 ? (
        <p className="px-2 py-3 text-sm text-faint">這天沒有任務</p>
      ) : (
        <ul>
          {tasks.map((t) => (
            <TaskItem key={t.id} task={t} now={now} hideDate />
          ))}
        </ul>
      )}
      <div className="px-2 pb-1 pt-2">
        <QuickAdd date={date} placeholder="新增這天的任務" />
      </div>
    </aside>
  );
}
