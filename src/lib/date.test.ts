import { describe, expect, it } from 'vitest';
import {
  addDaysKey,
  combineDateTime,
  formatDayLabel,
  formatFullDate,
  fromDateKey,
  getGreeting,
  getMonthGrid,
  getWeekDays,
  isValidDateKey,
  isValidTime,
  minutesToTime,
  nextHour,
  timeToMinutes,
  toDateKey,
} from './date';

describe('DateKey 轉換', () => {
  it('fromDateKey 產生本地當天 00:00，不受 UTC 影響', () => {
    const d = fromDateKey('2026-11-20');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(0);
  });

  it('來回轉換後日期不會位移（含月初、月底、年底、閏日）', () => {
    for (const key of ['2026-01-01', '2026-11-20', '2026-11-30', '2026-12-31', '2028-02-29', '2027-03-01']) {
      expect(toDateKey(fromDateKey(key))).toBe(key);
    }
  });

  it('一天中任何時刻都歸屬於同一個本地日期', () => {
    expect(toDateKey(new Date(2026, 10, 16, 0, 0, 0))).toBe('2026-11-16');
    expect(toDateKey(new Date(2026, 10, 16, 7, 59, 0))).toBe('2026-11-16');
    expect(toDateKey(new Date(2026, 10, 16, 23, 59, 59))).toBe('2026-11-16');
  });

  it('驗證日期字串', () => {
    expect(isValidDateKey('2026-11-16')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('2026/11/16')).toBe(false);
    expect(isValidDateKey('2026-11-16T00:00:00Z')).toBe(false);
    expect(isValidDateKey(null)).toBe(false);
  });

  it('驗證時間字串', () => {
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('9:00')).toBe(false);
    expect(isValidTime(undefined)).toBe(false);
  });
});

describe('日期運算', () => {
  it('跨月與跨年', () => {
    expect(addDaysKey('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysKey('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDaysKey('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('combineDateTime 使用本地時間', () => {
    const d = combineDateTime('2026-11-16', '14:30');
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([16, 14, 30]);
    expect(combineDateTime('2026-11-16').getHours()).toBe(0);
  });

  it('時間與分鐘互轉', () => {
    expect(timeToMinutes('14:30')).toBe(870);
    expect(minutesToTime(870)).toBe('14:30');
    expect(minutesToTime(24 * 60 + 30)).toBe('23:59');
    expect(nextHour(new Date(2026, 10, 16, 9, 20))).toBe('10:00');
    expect(nextHour(new Date(2026, 10, 16, 23, 20))).toBe('23:00');
  });
});

describe('月曆格子', () => {
  it('以星期一為一週起始，共 42 格且涵蓋整個月', () => {
    const grid = getMonthGrid(new Date(2026, 10, 1), 1);
    expect(grid).toHaveLength(42);
    expect(grid[0].getDay()).toBe(1);
    expect(toDateKey(grid[0])).toBe('2026-10-26');
    const keys = grid.map(toDateKey);
    expect(keys).toContain('2026-11-01');
    expect(keys).toContain('2026-11-30');
  });

  it('以星期日為一週起始', () => {
    const grid = getMonthGrid(new Date(2026, 10, 1), 0);
    expect(grid[0].getDay()).toBe(0);
    expect(toDateKey(grid[0])).toBe('2026-11-01');
  });

  it('跨年的月份', () => {
    const keys = getMonthGrid(new Date(2026, 11, 1), 1).map(toDateKey);
    expect(keys[0]).toBe('2026-11-30');
    expect(keys).toContain('2027-01-01');
  });

  it('週檢視的 7 天', () => {
    const days = getWeekDays(new Date(2026, 10, 18), 1).map(toDateKey);
    expect(days).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
  });
});

describe('顯示文字', () => {
  it('問候語依時段變化', () => {
    expect(getGreeting(new Date(2026, 10, 16, 8))).toBe('早安');
    expect(getGreeting(new Date(2026, 10, 16, 14))).toBe('午安');
    expect(getGreeting(new Date(2026, 10, 16, 21))).toBe('晚安');
    expect(getGreeting(new Date(2026, 10, 16, 2))).toBe('晚安');
  });

  it('台灣習慣的完整日期', () => {
    expect(formatFullDate(new Date(2026, 10, 16))).toBe('2026 年 11 月 16 日，星期一');
  });

  it('相對日期標籤', () => {
    expect(formatDayLabel('2026-11-16', '2026-11-16')).toBe('今天');
    expect(formatDayLabel('2026-11-17', '2026-11-16')).toBe('明天');
    expect(formatDayLabel('2026-11-15', '2026-11-16')).toBe('昨天');
    expect(formatDayLabel('2026-11-20', '2026-11-16')).toBe('11月20日 週五');
    expect(formatDayLabel('2027-01-05', '2026-11-16')).toBe('2027年1月5日 週二');
  });
});
