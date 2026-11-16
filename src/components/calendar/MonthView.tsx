import { getMonthGrid, toDateKey, weekdayShort } from '../../lib/date';
import { getCategoryColor, getEventColor, getEventsOnDay } from '../../lib/events';
import type { CalendarEvent, Category, DateKey, Task } from '../../types';
import { EventChip, TaskChip } from './chips';

interface MonthViewProps {
  cursor: Date;
  weekStartsOn: 0 | 1;
  today: DateKey;
  selected: DateKey;
  events: CalendarEvent[];
  tasksByDate: Map<DateKey, Task[]>;
  categories: Category[];
  onSelect: (date: DateKey) => void;
  onCreate: (date: DateKey) => void;
}

const MAX_CHIPS = 3;
const MAX_DOTS = 4;

export function MonthView({ cursor, weekStartsOn, today, selected, events, tasksByDate, categories, onSelect, onCreate }: MonthViewProps) {
  const days = getMonthGrid(cursor, weekStartsOn);
  const month = cursor.getMonth();

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line">
        {days.slice(0, 7).map((d) => (
          <div key={d.getDay()} className="py-2 text-center text-xs font-medium text-muted">
            <span className="hidden sm:inline">週</span>
            {weekdayShort(d)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const key = toDateKey(d);
          const dayEvents = getEventsOnDay(events, key);
          const dayTasks = tasksByDate.get(key) ?? [];
          const count = dayEvents.length + dayTasks.length;
          const isToday = key === today;
          const isSelected = key === selected;
          const outside = d.getMonth() !== month;
          // 超過上限時留一行給「+N 更多」
          const visible = count > MAX_CHIPS ? MAX_CHIPS - 1 : MAX_CHIPS;
          const shownEvents = dayEvents.slice(0, visible);
          const shownTasks = dayTasks.slice(0, Math.max(0, visible - shownEvents.length));
          const hidden = count - shownEvents.length - shownTasks.length;
          const dots = [
            ...dayEvents.map((e) => ({ id: e.id, color: getEventColor(e, categories), done: false })),
            ...dayTasks.map((t) => ({ id: t.id, color: getCategoryColor(t.categoryId, categories), done: t.status === 'completed' })),
          ];

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-label={`${d.getMonth() + 1}月${d.getDate()}日，${count} 個項目`}
              aria-pressed={isSelected}
              onClick={() => onSelect(key)}
              onDoubleClick={() => onCreate(key)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(key);
                }
              }}
              className={`relative flex min-h-[60px] min-w-0 cursor-pointer flex-col gap-0.5 border-line p-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:min-h-[108px] sm:p-1.5 ${
                i % 7 !== 6 ? 'border-r' : ''
              } ${i < 35 ? 'border-b' : ''} ${isSelected ? 'bg-primary-soft/60' : 'hover:bg-surface2/60'}`}
            >
              <span
                className={`mx-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums sm:mx-0 ${
                  isToday ? 'bg-primary font-semibold text-white' : outside ? 'text-faint' : 'font-medium text-ink'
                }`}
              >
                {d.getDate()}
              </span>

              {/* 桌面：顯示標籤 */}
              <div className={`hidden min-w-0 flex-col gap-0.5 sm:flex ${outside ? 'opacity-60' : ''}`}>
                {shownEvents.map((e) => (
                  <EventChip key={e.id} event={e} categories={categories} timeLabel={!e.allDay && e.startDate === key ? e.startTime : null} />
                ))}
                {shownTasks.map((t) => (
                  <TaskChip key={t.id} task={t} categories={categories} />
                ))}
                {hidden > 0 && <span className="px-1.5 text-[11px] font-medium leading-4 text-muted">+{hidden} 更多</span>}
              </div>

              {/* 手機：精簡成圓點 */}
              {dots.length > 0 && (
                <div className={`flex flex-wrap items-center justify-center gap-0.5 sm:hidden ${outside ? 'opacity-60' : ''}`}>
                  {dots.slice(0, MAX_DOTS).map((dot) => (
                    <span key={dot.id} className={`h-1.5 w-1.5 rounded-full ${dot.done ? 'opacity-40' : ''}`} style={{ backgroundColor: dot.color }} />
                  ))}
                  {dots.length > MAX_DOTS && <span className="text-[9px] leading-none text-faint">+{dots.length - MAX_DOTS}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
