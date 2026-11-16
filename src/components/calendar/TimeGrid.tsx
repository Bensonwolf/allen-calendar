import { useEffect, useRef, type MouseEvent } from 'react';
import { minutesToTime, toDateKey, weekdayShort } from '../../lib/date';
import { eventOccursOn, formatEventTimeOnDay, getEventColor, layoutTimedEvents } from '../../lib/events';
import { useUI } from '../../store/uiStore';
import type { CalendarEvent, Category, DateKey, Task } from '../../types';
import { EventChip, TaskChip } from './chips';

interface TimeGridProps {
  days: Date[];
  today: DateKey;
  now: Date;
  events: CalendarEvent[];
  tasksByDate: Map<DateKey, Task[]>;
  categories: Category[];
  onSlotClick: (date: DateKey, time: string) => void;
  onDayClick: (date: DateKey) => void;
}

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** 週檢視與日檢視共用的時間格（days 為 7 天或 1 天）。 */
export function TimeGrid({ days, today, now, events, tasksByDate, categories, onSlotClick, onDayClick }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const openEventDetail = useUI((s) => s.openEventDetail);
  const single = days.length === 1;
  const columns = { gridTemplateColumns: `2.75rem repeat(${days.length}, minmax(0, 1fr))` };
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;

  // 進入時捲到早上 7 點附近
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT - 8;
  }, [days.length]);

  const handleSlotClick = (e: MouseEvent<HTMLDivElement>, date: DateKey) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hour = Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top) / HOUR_HEIGHT)));
    onSlotClick(date, minutesToTime(hour * 60));
  };

  return (
    <div className="card overflow-hidden">
      <div ref={scrollRef} className="h-[calc(100dvh-15rem)] min-h-[420px] overflow-y-auto">
        {/* 日期列與全天/任務列（固定在頂端） */}
        <div data-grid-header className="sticky top-0 z-20 border-b border-line bg-surface">
          <div className="grid" style={columns}>
            <div />
            {days.map((d) => {
              const key = toDateKey(d);
              const isToday = key === today;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onDayClick(key)}
                  disabled={single}
                  className="flex flex-col items-center gap-0.5 border-l border-line py-2 transition-colors enabled:hover:bg-surface2/60"
                >
                  <span className={`text-[11px] ${isToday ? 'font-medium text-primary' : 'text-muted'}`}>週{weekdayShort(d)}</span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums ${
                      isToday ? 'bg-primary font-semibold text-white' : 'font-medium'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid border-t border-line" style={columns}>
            <div className="flex items-start justify-end px-1 pt-1.5 text-[10px] leading-3 text-faint">全天</div>
            {days.map((d) => {
              const key = toDateKey(d);
              const allDay = events.filter((e) => e.allDay && eventOccursOn(e, key));
              const dayTasks = tasksByDate.get(key) ?? [];
              return (
                <div key={key} className="flex max-h-28 min-h-[28px] min-w-0 flex-col gap-0.5 overflow-y-auto border-l border-line p-1">
                  {allDay.map((e) => (
                    <EventChip key={e.id} event={e} categories={categories} />
                  ))}
                  {dayTasks.map((t) => (
                    <TaskChip key={t.id} task={t} categories={categories} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* 時間格 */}
        <div className="grid" style={columns}>
          <div className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
            {HOURS.map((h) =>
              h === 0 ? null : (
                <span
                  key={h}
                  className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-faint"
                  style={{ top: h * HOUR_HEIGHT }}
                >
                  {String(h).padStart(2, '0')}:00
                </span>
              ),
            )}
          </div>
          {days.map((d) => {
            const key = toDateKey(d);
            const laidOut = layoutTimedEvents(events, key);
            return (
              <div
                key={key}
                className="relative cursor-pointer border-l border-line"
                style={{
                  height: 24 * HOUR_HEIGHT,
                  backgroundImage: 'linear-gradient(to bottom, rgb(var(--border)) 1px, transparent 1px)',
                  backgroundSize: `100% ${HOUR_HEIGHT}px`,
                }}
                onClick={(e) => handleSlotClick(e, key)}
                role="button"
                aria-label={`在 ${d.getMonth() + 1}月${d.getDate()}日新增行程`}
              >
                {laidOut.map(({ event, startMin, endMin, col, cols }) => {
                  const color = getEventColor(event, categories);
                  const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEventDetail(event.id);
                      }}
                      title={`${event.title}（${formatEventTimeOnDay(event, key)}）`}
                      className="absolute overflow-hidden rounded-md border-l-[3px] bg-surface px-1 py-0.5 text-left transition-shadow hover:z-10 hover:shadow-card sm:px-1.5"
                      style={{
                        top: (startMin / 60) * HOUR_HEIGHT + 1,
                        height,
                        left: `calc(${(col / cols) * 100}% + 2px)`,
                        width: `calc(${100 / cols}% - 4px)`,
                        borderLeftColor: color,
                        backgroundImage: `linear-gradient(${color}2e, ${color}2e)`,
                      }}
                    >
                      <span className="block truncate text-[11px] font-medium leading-4 text-ink">{event.title}</span>
                      {height >= 36 && (
                        <span className="block truncate text-[10px] leading-3 tabular-nums text-muted">{formatEventTimeOnDay(event, key)}</span>
                      )}
                    </button>
                  );
                })}
                {key === today && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: nowTop }} aria-hidden>
                    <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
                    <span className="h-px flex-1 bg-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
