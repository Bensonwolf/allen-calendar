import { AlertCircle, CalendarClock, CalendarPlus, ChevronDown, ListChecks, PartyPopper, Plus, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EventRow } from '../components/events/EventRow';
import { QuickAdd } from '../components/tasks/QuickAdd';
import { TaskItem } from '../components/tasks/TaskItem';
import { EmptyState } from '../components/ui/primitives';
import { useNow } from '../hooks/useNow';
import { addDaysKey, formatDayLabel, formatFullDate, formatMonthDay, getGreeting, toDateKey } from '../lib/date';
import { getEventsOnDay } from '../lib/events';
import { getCompletionPercent, isOverdue, isTodayTask, sortTasks } from '../lib/tasks';
import { useAppStore } from '../store';
import { useUI } from '../store/uiStore';
import type { CalendarEvent, DateKey, Task } from '../types';

function StatTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-surface2/70 px-3.5 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${tone ?? ''}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const now = useNow();
  const today = toDateKey(now);
  const tasks = useAppStore((s) => s.tasks);
  const events = useAppStore((s) => s.events);
  const openTaskForm = useUI((s) => s.openTaskForm);
  const openEventForm = useUI((s) => s.openEventForm);
  const [showDone, setShowDone] = useState(true);

  const { todo, done, overdue } = useMemo(() => {
    const todays = tasks.filter((t) => isTodayTask(t, today));
    return {
      todo: sortTasks(
        todays.filter((t) => t.status === 'todo'),
        'priority',
      ),
      done: todays
        .filter((t) => t.status === 'completed')
        .sort((a, b) => (a.completedAt ?? '') < (b.completedAt ?? '') ? 1 : -1),
      // 今天以前就到期、還沒完成的任務
      overdue: sortTasks(
        tasks.filter((t) => t.dueDate !== null && t.dueDate < today && isOverdue(t, now)),
        'dueDate',
      ),
    };
  }, [tasks, today, now]);

  const todayEvents = useMemo(() => getEventsOnDay(events, today), [events, today]);

  const upcoming = useMemo(() => {
    const days: { date: DateKey; tasks: Task[]; events: CalendarEvent[] }[] = [];
    for (let i = 1; i <= 7; i++) {
      const date = addDaysKey(today, i);
      const dayTasks = sortTasks(
        tasks.filter((t) => t.dueDate === date && t.status === 'todo'),
        'priority',
      );
      const dayEvents = getEventsOnDay(events, date);
      if (dayTasks.length > 0 || dayEvents.length > 0) days.push({ date, tasks: dayTasks, events: dayEvents });
    }
    return days;
  }, [tasks, events, today]);

  const total = todo.length + done.length;
  const percent = getCompletionPercent(done.length, total);
  const focus = todo[0];

  let hint: string;
  if (total === 0) hint = '今天還沒有待辦事項，新增一件事開始規劃吧。';
  else if (todo.length === 0) hint = `今天的 ${total} 件待辦事項全部完成了，做得好！`;
  else if (done.length === 0) hint = `今天有 ${total} 件待辦事項，一件一件來。`;
  else hint = `今天有 ${total} 件待辦事項，其中 ${done.length} 件已完成。`;
  if (todayEvents.length > 0) hint += ` 另有 ${todayEvents.length} 個行程。`;

  return (
    <div className="space-y-5">
      {/* 頂部資訊 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">{formatFullDate(now)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">{getGreeting(now)}，Allen</h1>
          <p className="mt-1.5 text-sm text-muted">{hint}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={() => openTaskForm({ dueDate: today })}>
            <Plus size={16} />
            新增任務
          </button>
          <button type="button" className="btn btn-outline" onClick={() => openEventForm({ date: today })}>
            <CalendarPlus size={16} />
            新增行程
          </button>
        </div>
      </div>

      {/* 逾期提醒 */}
      {overdue.length > 0 && (
        <section className="rounded-2xl border border-red-500/25 bg-red-500/5 p-3 sm:p-4" aria-label="逾期提醒">
          <div className="flex items-center gap-2 px-2 pb-1 text-sm font-medium text-red-600 dark:text-red-400">
            <AlertCircle size={16} />
            有 {overdue.length} 件任務已逾期
          </div>
          <ul>
            {overdue.slice(0, 5).map((t) => (
              <TaskItem key={t.id} task={t} now={now} />
            ))}
          </ul>
          {overdue.length > 5 && (
            <Link to="/tasks?filter=overdue" className="ml-2 mt-1 inline-block text-xs font-medium text-red-600 hover:underline dark:text-red-400">
              查看全部 {overdue.length} 件逾期任務
            </Link>
          )}
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* 今日進度 */}
          <section className="card p-5" aria-label="今日進度">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">今日進度</h2>
              {total > 0 && <span className="text-sm font-semibold tabular-nums text-primary">{percent}%</span>}
            </div>
            {total === 0 ? (
              <EmptyState icon={ListChecks} title="今天還沒有任務" hint="新增今天要完成的事情，這裡會顯示完成進度" />
            ) : (
              <>
                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface2"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="今日完成百分比"
                >
                  <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatTile label="今日任務" value={String(total)} />
                  <StatTile label="尚未完成" value={String(todo.length)} tone={todo.length > 0 ? 'text-orange-500' : ''} />
                  <StatTile label="已完成" value={String(done.length)} tone={done.length > 0 ? 'text-emerald-500' : ''} />
                  <StatTile label="完成率" value={`${percent}%`} tone="text-primary" />
                </div>
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line px-3.5 py-3 text-sm">
                  {focus ? (
                    <>
                      <Target size={16} className="mt-0.5 shrink-0 text-primary" />
                      <p className="min-w-0">
                        <span className="text-muted">今日焦點：</span>
                        <span className="break-words font-medium">{focus.title}</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <PartyPopper size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                      <p className="text-muted">今天的任務都完成了，好好休息一下。</p>
                    </>
                  )}
                </div>
              </>
            )}
          </section>

          {/* 今日待辦 */}
          <section className="card p-3 sm:p-4" aria-label="今日待辦事項">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <h2 className="text-sm font-semibold">
                要做 <span className="font-normal text-faint">To Do</span>
                <span className="ml-2 rounded-full bg-surface2 px-2 py-0.5 text-xs font-medium tabular-nums text-muted">{todo.length}</span>
              </h2>
              <Link to="/tasks" className="text-xs font-medium text-primary hover:underline">
                全部待辦
              </Link>
            </div>
            <div className="px-2 pb-2">
              <QuickAdd date={today} placeholder="新增今天的任務，按 Enter 送出" />
            </div>
            {todo.length === 0 ? (
              <p className="px-2 py-5 text-center text-sm text-faint">{total === 0 ? '今天沒有待辦事項' : '今天的待辦都完成了 🎉'}</p>
            ) : (
              <ul>
                {todo.map((t) => (
                  <TaskItem key={t.id} task={t} now={now} hideDate />
                ))}
              </ul>
            )}

            <div className="mt-2 border-t border-line pt-2">
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                aria-expanded={showDone}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-surface2/70"
              >
                <span className="text-sm font-semibold">
                  已完成 <span className="font-normal text-faint">Completed</span>
                  <span className="ml-2 rounded-full bg-surface2 px-2 py-0.5 text-xs font-medium tabular-nums text-muted">{done.length}</span>
                </span>
                <ChevronDown size={16} className={`text-faint transition-transform ${showDone ? 'rotate-180' : ''}`} />
              </button>
              {showDone &&
                (done.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-faint">完成的任務會出現在這裡</p>
                ) : (
                  <ul>
                    {done.map((t) => (
                      <TaskItem key={t.id} task={t} now={now} hideDate />
                    ))}
                  </ul>
                ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          {/* 今日行程 */}
          <section className="card p-3 sm:p-4" aria-label="今日行程">
            <div className="flex items-center justify-between px-2 pb-1 pt-1">
              <h2 className="text-sm font-semibold">今日行程</h2>
              <Link to="/calendar" className="text-xs font-medium text-primary hover:underline">
                行事曆
              </Link>
            </div>
            {todayEvents.length === 0 ? (
              <EmptyState icon={CalendarClock} title="今天尚無安排的行程" />
            ) : (
              <ul>
                {todayEvents.map((e) => (
                  <EventRow key={e.id} event={e} day={today} now={now} />
                ))}
              </ul>
            )}
          </section>

          {/* 即將到來 */}
          <section className="card p-3 sm:p-4" aria-label="即將到來">
            <div className="px-2 pb-1 pt-1">
              <h2 className="text-sm font-semibold">即將到來</h2>
              <p className="text-xs text-faint">未來 7 天的任務與行程</p>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarClock} title="未來 7 天沒有安排" />
            ) : (
              <div className="space-y-2">
                {upcoming.map((day) => (
                  <div key={day.date}>
                    <p className="px-2 pb-0.5 pt-2 text-xs font-medium text-muted">
                      {formatDayLabel(day.date, today)}
                      {day.date === addDaysKey(today, 1) && <span className="ml-1.5 font-normal text-faint">{formatMonthDay(day.date)}</span>}
                    </p>
                    <ul>
                      {day.events.map((e) => (
                        <EventRow key={e.id} event={e} day={day.date} now={now} />
                      ))}
                      {day.tasks.map((t) => (
                        <TaskItem key={t.id} task={t} now={now} hideDate />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
