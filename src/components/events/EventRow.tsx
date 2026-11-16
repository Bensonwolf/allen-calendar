import { MapPin } from 'lucide-react';
import { formatEventTimeOnDay, getEventColor, isEventOngoing } from '../../lib/events';
import { useAppStore } from '../../store';
import { useUI } from '../../store/uiStore';
import type { CalendarEvent, DateKey } from '../../types';

/** 清單中的一筆行程（今日行程、即將到來、行事曆當日面板共用）。 */
export function EventRow({ event, day, now }: { event: CalendarEvent; day: DateKey; now: Date }) {
  const categories = useAppStore((s) => s.categories);
  const open = useUI((s) => s.openEventDetail);
  const ongoing = isEventOngoing(event, now);
  const color = getEventColor(event, categories);

  return (
    <li className="animate-fade-up">
      <button
        type="button"
        onClick={() => open(event.id)}
        className="flex w-full items-stretch gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface2/70"
      >
        <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 truncate text-sm font-medium">{event.title}</span>
            {ongoing && (
              <span className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                進行中
              </span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs text-muted">
            <span className="tabular-nums">{formatEventTimeOnDay(event, day)}</span>
            {event.location && (
              <span className="inline-flex min-w-0 items-center gap-0.5">
                <MapPin size={11} className="shrink-0" />
                <span className="max-w-[10rem] truncate">{event.location}</span>
              </span>
            )}
          </span>
          {event.notes && <span className="mt-0.5 block truncate text-xs text-faint">{event.notes}</span>}
        </span>
      </button>
    </li>
  );
}
