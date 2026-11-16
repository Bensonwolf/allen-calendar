import type { CalendarEvent, Category, DateKey, Task } from '../types';
import { addDaysKey, combineDateTime, formatMonthDay, fromDateKey, isValidDateKey, isValidTime, timeToMinutes } from './date';
import { OTHER_CATEGORY_ID } from './defaults';

export function getEventStart(event: CalendarEvent): Date {
  return combineDateTime(event.startDate, event.allDay ? null : event.startTime);
}

/** 行程結束的瞬間；全天行程結束於結束日的隔天 00:00。 */
export function getEventEnd(event: CalendarEvent): Date {
  if (event.allDay || !event.endTime) return fromDateKey(addDaysKey(event.endDate, 1));
  return combineDateTime(event.endDate, event.endTime);
}

/** 行程是否涵蓋某一天（支援跨日）。 */
export function eventOccursOn(event: CalendarEvent, key: DateKey): boolean {
  if (key < event.startDate || key > event.endDate) return false;
  // 跨日且剛好在 00:00 結束的行程，不算佔用結束那一天
  if (!event.allDay && key === event.endDate && event.endDate > event.startDate && event.endTime === '00:00') return false;
  return true;
}

/** 某一天內，行程佔用的分鐘範圍（0–1440）。全天或整天被涵蓋時為 0–1440。 */
export function getDaySegment(event: CalendarEvent, key: DateKey): { startMin: number; endMin: number } {
  if (event.allDay) return { startMin: 0, endMin: 1440 };
  const startMin = key === event.startDate && event.startTime ? timeToMinutes(event.startTime) : 0;
  const endMin = key === event.endDate && event.endTime ? timeToMinutes(event.endTime) : 1440;
  return { startMin, endMin: Math.max(endMin, startMin) };
}

/** 取得某一天的行程：全天優先，其餘依開始時間排序。 */
export function getEventsOnDay(events: CalendarEvent[], key: DateKey): CalendarEvent[] {
  return events
    .filter((e) => eventOccursOn(e, key))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      const sa = getDaySegment(a, key);
      const sb = getDaySegment(b, key);
      return sa.startMin - sb.startMin || sa.endMin - sb.endMin || a.title.localeCompare(b.title, 'zh-Hant');
    });
}

export function isEventOngoing(event: CalendarEvent, now: Date): boolean {
  const t = now.getTime();
  return t >= getEventStart(event).getTime() && t < getEventEnd(event).getTime();
}

/** 在某一天的清單中顯示的時間文字。 */
export function formatEventTimeOnDay(event: CalendarEvent, key: DateKey): string {
  if (event.allDay) return '全天';
  const startsToday = key === event.startDate;
  const endsToday = key === event.endDate;
  if (startsToday && endsToday) return `${event.startTime}–${event.endTime}`;
  if (startsToday) return `${event.startTime} 起`;
  if (endsToday) return `至 ${event.endTime}`;
  return '全天';
}

/** 行程詳細內容用的完整時間範圍文字。 */
export function formatEventRange(event: CalendarEvent): string {
  const sameDay = event.startDate === event.endDate;
  if (event.allDay) {
    return sameDay
      ? `${formatMonthDay(event.startDate)}・全天`
      : `${formatMonthDay(event.startDate)} – ${formatMonthDay(event.endDate)}・全天`;
  }
  return sameDay
    ? `${formatMonthDay(event.startDate)} ${event.startTime}–${event.endTime}`
    : `${formatMonthDay(event.startDate)} ${event.startTime} – ${formatMonthDay(event.endDate)} ${event.endTime}`;
}

export interface EventTimeFields {
  startDate: string;
  startTime: string | null;
  endDate: string;
  endTime: string | null;
  allDay: boolean;
}

/** 驗證行程時間；回傳錯誤訊息，合理時回傳 null。 */
export function validateEventTimes(input: EventTimeFields): string | null {
  if (!isValidDateKey(input.startDate) || !isValidDateKey(input.endDate)) return '請選擇有效的開始與結束日期';
  if (input.endDate < input.startDate) return '結束日期不能早於開始日期';
  if (!input.allDay) {
    if (!isValidTime(input.startTime) || !isValidTime(input.endTime)) return '請輸入有效的開始與結束時間';
    if (input.endDate === input.startDate && input.endTime < input.startTime) return '結束時間不能早於開始時間';
  }
  return null;
}

export function getEventColor(event: CalendarEvent, categories: Category[]): string {
  if (event.color) return event.color;
  return getCategoryColor(event.categoryId, categories);
}

export function getCategoryColor(categoryId: string, categories: Category[]): string {
  const cat = categories.find((c) => c.id === categoryId) ?? categories.find((c) => c.id === OTHER_CATEGORY_ID);
  return cat?.color ?? '#64748b';
}

export interface LaidOutEvent {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  /** 所在欄（0 起算） */
  col: number;
  /** 同一群重疊行程的總欄數 */
  cols: number;
}

/** 週/日檢視：計算某一天有時間的行程位置，重疊的行程並排顯示。 */
export function layoutTimedEvents(events: CalendarEvent[], key: DateKey, minDuration = 30): LaidOutEvent[] {
  const items = events
    .filter((e) => !e.allDay && eventOccursOn(e, key))
    .map((event) => {
      const seg = getDaySegment(event, key);
      return { event, startMin: seg.startMin, endMin: Math.min(1440, Math.max(seg.endMin, seg.startMin + minDuration)) };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const result: LaidOutEvent[] = [];
  let cluster: LaidOutEvent[] = [];
  let clusterEnd = -1;
  let colEnds: number[] = [];

  const flush = () => {
    for (const item of cluster) item.cols = colEnds.length;
    result.push(...cluster);
    cluster = [];
    colEnds = [];
  };

  for (const item of items) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= item.startMin);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(item.endMin);
    } else {
      colEnds[col] = item.endMin;
    }
    cluster.push({ ...item, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (cluster.length > 0) flush();
  return result;
}

export interface UpcomingDay {
  date: DateKey;
  tasks: Task[];
  events: CalendarEvent[];
}
