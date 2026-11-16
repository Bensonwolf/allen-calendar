import { CalendarDays, CheckCircle2, Circle, Search } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { formatDayLabel, toDateKey } from '../lib/date';
import { formatEventRange } from '../lib/events';
import { searchAll } from '../lib/search';
import { useAppStore } from '../store';
import { useUI } from '../store/uiStore';

export function SearchDialogHost() {
  const open = useUI((s) => s.searchOpen);
  if (!open) return null;
  return <SearchDialog />;
}

type Result = { key: string; kind: 'task' | 'event'; id: string; title: string; meta: string; done?: boolean };

function SearchDialog() {
  const close = useUI((s) => s.closeSearch);
  const openTaskDetail = useUI((s) => s.openTaskDetail);
  const openEventDetail = useUI((s) => s.openEventDetail);
  const tasks = useAppStore((s) => s.tasks);
  const events = useAppStore((s) => s.events);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo<Result[]>(() => {
    const today = toDateKey(new Date());
    const found = searchAll(query, tasks, events);
    return [
      ...found.tasks.map<Result>((t) => ({
        key: `t-${t.id}`,
        kind: 'task',
        id: t.id,
        title: t.title,
        meta: [t.dueDate ? `${formatDayLabel(t.dueDate, today)}${t.dueTime ? ` ${t.dueTime}` : ''}` : '未指定日期', t.description]
          .filter(Boolean)
          .join('・'),
        done: t.status === 'completed',
      })),
      ...found.events.map<Result>((e) => ({
        key: `e-${e.id}`,
        kind: 'event',
        id: e.id,
        title: e.title,
        meta: [formatEventRange(e), e.notes].filter(Boolean).join('・'),
      })),
    ];
  }, [query, tasks, events]);

  const choose = (r: Result) => {
    if (r.kind === 'task') openTaskDetail(r.id);
    else openEventDetail(r.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      choose(results[active]);
    }
  };

  const hasQuery = query.trim().length > 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[8vh] sm:p-4 sm:pt-[14vh]" role="dialog" aria-modal="true" aria-label="搜尋">
      <div className="absolute inset-0 animate-fade bg-black/40" onClick={close} />
      <div className="relative flex max-h-[70dvh] w-full max-w-xl animate-pop flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="shrink-0 text-faint" />
          <input
            className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
            placeholder="搜尋任務與行程…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            autoFocus
            aria-label="搜尋任務與行程"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[11px] text-faint sm:block">Esc</kbd>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!hasQuery && <p className="px-3 py-6 text-center text-sm text-faint">輸入關鍵字，搜尋任務名稱、描述、行程名稱與備註</p>}
          {hasQuery && results.length === 0 && <p className="px-3 py-6 text-center text-sm text-faint">找不到符合「{query.trim()}」的結果</p>}
          <ul>
            {results.map((r, i) => (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left ${i === active ? 'bg-surface2' : ''}`}
                >
                  <span className="mt-0.5 shrink-0 text-faint">
                    {r.kind === 'event' ? (
                      <CalendarDays size={16} />
                    ) : r.done ? (
                      <CheckCircle2 size={16} className="text-primary" />
                    ) : (
                      <Circle size={16} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${r.done ? 'text-faint line-through' : ''}`}>{r.title}</span>
                    <span className="block truncate text-xs text-faint">
                      {r.kind === 'task' ? '任務' : '行程'}・{r.meta}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
