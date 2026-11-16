import { addDays, addMonths, format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DayPanel } from '../components/calendar/DayPanel';
import { MonthView } from '../components/calendar/MonthView';
import { TimeGrid } from '../components/calendar/TimeGrid';
import { useNow } from '../hooks/useNow';
import { formatFullDate, formatMonthTitle, fromDateKey, getWeekDays, toDateKey } from '../lib/date';
import { groupTasksByDate } from '../lib/tasks';
import { useAppStore } from '../store';
import { useUI } from '../store/uiStore';
import type { CalendarView, DateKey } from '../types';

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'month', label: '月' },
  { value: 'week', label: '週' },
  { value: 'day', label: '日' },
];

export default function CalendarPage() {
  const now = useNow();
  const today = toDateKey(now);
  const tasks = useAppStore((s) => s.tasks);
  const events = useAppStore((s) => s.events);
  const categories = useAppStore((s) => s.categories);
  const settings = useAppStore((s) => s.settings);
  const selectedInStore = useUI((s) => s.selectedDate);
  const setSelectedDate = useUI((s) => s.setSelectedDate);
  const openEventForm = useUI((s) => s.openEventForm);

  const [view, setView] = useState<CalendarView>(settings.defaultCalendarView);
  const selected: DateKey = selectedInStore ?? today;
  const cursor = useMemo(() => fromDateKey(selected), [selected]);

  // 進入頁面時選取今天；離開時清除，讓其他頁面的快速新增回到「今天」
  useEffect(() => {
    setSelectedDate(toDateKey(new Date()));
    return () => setSelectedDate(null);
  }, [setSelectedDate]);

  const tasksByDate = useMemo(
    () => groupTasksByDate(settings.showCompleted ? tasks : tasks.filter((t) => t.status === 'todo')),
    [tasks, settings.showCompleted],
  );

  const weekDays = useMemo(() => getWeekDays(cursor, settings.weekStartsOn), [cursor, settings.weekStartsOn]);

  const move = (direction: 1 | -1) => {
    const next = view === 'month' ? addMonths(cursor, direction) : addDays(cursor, direction * (view === 'week' ? 7 : 1));
    setSelectedDate(toDateKey(next));
  };

  let title: string;
  if (view === 'month') title = formatMonthTitle(cursor);
  else if (view === 'day') title = formatFullDate(cursor);
  else {
    const first = weekDays[0];
    const last = weekDays[6];
    const sameMonth = first.getMonth() === last.getMonth();
    title = `${format(first, 'yyyy 年 M 月 d 日', { locale: zhTW })} – ${format(last, sameMonth ? 'd 日' : 'M 月 d 日', { locale: zhTW })}`;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-3">
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-outline" onClick={() => setSelectedDate(today)}>
            今天
          </button>
          <button type="button" className="icon-btn" onClick={() => move(-1)} aria-label={view === 'month' ? '上個月' : view === 'week' ? '上一週' : '前一天'}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="icon-btn" onClick={() => move(1)} aria-label={view === 'month' ? '下個月' : view === 'week' ? '下一週' : '後一天'}>
            <ChevronRight size={18} />
          </button>
        </div>
        <h1 className="order-first w-full text-xl font-semibold tracking-tight sm:order-none sm:w-auto sm:text-2xl">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            className="input hidden w-auto lg:block"
            value={selected}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            aria-label="選擇日期"
          />
          <div className="segmented" role="group" aria-label="檢視模式">
            {VIEWS.map((v) => (
              <button key={v.value} type="button" aria-pressed={view === v.value} onClick={() => setView(v.value)}>
                {v.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => openEventForm({ date: selected })}>
            <CalendarPlus size={16} />
            <span className="hidden sm:inline">新增行程</span>
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <MonthView
            cursor={cursor}
            weekStartsOn={settings.weekStartsOn}
            today={today}
            selected={selected}
            events={events}
            tasksByDate={tasksByDate}
            categories={categories}
            onSelect={setSelectedDate}
            onCreate={(date) => openEventForm({ date })}
          />
          <DayPanel date={selected} today={today} now={now} events={events} tasks={tasksByDate.get(selected) ?? []} />
        </div>
      ) : (
        <TimeGrid
          days={view === 'week' ? weekDays : [cursor]}
          today={today}
          now={now}
          events={events}
          tasksByDate={tasksByDate}
          categories={categories}
          onSlotClick={(date, time) => openEventForm({ date, time })}
          onDayClick={(date) => {
            setSelectedDate(date);
            setView('day');
          }}
        />
      )}
    </div>
  );
}
