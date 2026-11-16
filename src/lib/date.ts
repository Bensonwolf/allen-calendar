import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { DateKey, TimeString } from '../types';

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Date → 本地日曆日期字串（yyyy-MM-dd）。 */
export function toDateKey(date: Date): DateKey {
  return format(date, 'yyyy-MM-dd');
}

/** 本地日曆日期字串 → 當天本地 00:00 的 Date。刻意不用 new Date('yyyy-MM-dd')，因為那會被當成 UTC。 */
export function fromDateKey(key: DateKey): Date {
  const m = DATE_KEY_RE.exec(key);
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function isValidDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !DATE_KEY_RE.test(value)) return false;
  const d = fromDateKey(value);
  return !Number.isNaN(d.getTime()) && toDateKey(d) === value;
}

export function isValidTime(value: unknown): value is TimeString {
  return typeof value === 'string' && TIME_RE.test(value);
}

export function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 10 && !Number.isNaN(Date.parse(value));
}

/** 日期 + 時間 → 本地時間的 Date。沒有時間時為當天 00:00。 */
export function combineDateTime(key: DateKey, time?: TimeString | null): Date {
  const d = fromDateKey(key);
  if (time && TIME_RE.test(time)) {
    const [h, m] = time.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

export function addDaysKey(key: DateKey, amount: number): DateKey {
  return toDateKey(addDays(fromDateKey(key), amount));
}

/** UTC 時間戳記 → 它在本地落在哪一天。 */
export function timestampToDateKey(iso: string): DateKey {
  return toDateKey(new Date(iso));
}

export function timeToMinutes(time: TimeString): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): TimeString {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 下一個整點（23 點之後回傳 23:00）。 */
export function nextHour(now: Date): TimeString {
  return minutesToTime(Math.min(23, now.getHours() + 1) * 60);
}

export function getGreeting(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 11) return '早安';
  if (h >= 11 && h < 18) return '午安';
  return '晚安';
}

/** 2026 年 11 月 16 日，星期一 */
export function formatFullDate(date: Date): string {
  return format(date, 'yyyy 年 M 月 d 日，EEEE', { locale: zhTW });
}

/** 2026 年 11 月 */
export function formatMonthTitle(date: Date): string {
  return format(date, 'yyyy 年 M 月', { locale: zhTW });
}

/** 11月16日 週一 */
export function formatMonthDay(key: DateKey): string {
  return format(fromDateKey(key), 'M月d日 EEE', { locale: zhTW });
}

/** 今天 / 明天 / 昨天，否則 11月20日 週五（跨年時加上年份）。 */
export function formatDayLabel(key: DateKey, today: DateKey): string {
  if (key === today) return '今天';
  if (key === addDaysKey(today, 1)) return '明天';
  if (key === addDaysKey(today, -1)) return '昨天';
  const d = fromDateKey(key);
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return format(d, sameYear ? 'M月d日 EEE' : 'yyyy年M月d日 EEE', { locale: zhTW });
}

/** 時間戳記 → 本地 HH:mm */
export function formatClock(iso: string): string {
  return format(new Date(iso), 'HH:mm');
}

/** 月檢視用的 6 週 × 7 天格子。 */
export function getMonthGrid(month: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn });
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function getWeekDays(date: Date, weekStartsOn: 0 | 1): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn }),
    end: endOfWeek(date, { weekStartsOn }),
  });
}

export function getMonthRange(month: Date): { start: DateKey; end: DateKey } {
  return { start: toDateKey(startOfMonth(month)), end: toDateKey(endOfMonth(month)) };
}

/** 一、二、三… */
export function weekdayShort(date: Date): string {
  return format(date, 'EEEEE', { locale: zhTW });
}
