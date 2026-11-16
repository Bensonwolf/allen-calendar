import type { CalendarEvent, Task } from '../types';
import { sortTasks } from './tasks';

export interface SearchResults {
  tasks: Task[];
  events: CalendarEvent[];
}

/** 搜尋任務名稱/描述與行程名稱/備註/地點（不分大小寫）。 */
export function searchAll(query: string, tasks: Task[], events: CalendarEvent[], limit = 20): SearchResults {
  const q = query.trim().toLowerCase();
  if (!q) return { tasks: [], events: [] };
  const has = (text: string) => text.toLowerCase().includes(q);
  return {
    tasks: sortTasks(
      tasks.filter((t) => has(t.title) || has(t.description)),
      'dueDate',
    ).slice(0, limit),
    events: events
      .filter((e) => has(e.title) || has(e.notes) || has(e.location))
      .sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0))
      .slice(0, limit),
  };
}
