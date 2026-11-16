import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../types';
import {
  eventOccursOn,
  formatEventTimeOnDay,
  getDaySegment,
  getEventsOnDay,
  isEventOngoing,
  layoutTimedEvents,
  validateEventTimes,
} from './events';

let seq = 0;
function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    title: `行程 ${seq}`,
    startDate: '2026-11-16',
    startTime: '14:00',
    endDate: '2026-11-16',
    endTime: '15:00',
    allDay: false,
    categoryId: 'cat-other',
    color: null,
    location: '',
    notes: '',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('行程時間驗證', () => {
  const base = { startDate: '2026-11-16', startTime: '14:00', endDate: '2026-11-16', endTime: '15:00', allDay: false };

  it('合理的時間通過驗證', () => {
    expect(validateEventTimes(base)).toBeNull();
    expect(validateEventTimes({ ...base, endTime: '14:00' })).toBeNull();
  });

  it('同一天結束時間早於開始時間', () => {
    expect(validateEventTimes({ ...base, endTime: '13:00' })).toBe('結束時間不能早於開始時間');
  });

  it('結束日期早於開始日期', () => {
    expect(validateEventTimes({ ...base, endDate: '2026-11-15' })).toBe('結束日期不能早於開始日期');
  });

  it('跨日行程的結束時間可以比開始時間早', () => {
    expect(validateEventTimes({ ...base, startTime: '22:00', endDate: '2026-11-17', endTime: '02:00' })).toBeNull();
  });

  it('全天行程不需要時間；非全天行程必須有時間', () => {
    expect(validateEventTimes({ ...base, allDay: true, startTime: null, endTime: null })).toBeNull();
    expect(validateEventTimes({ ...base, startTime: null })).not.toBeNull();
    expect(validateEventTimes({ ...base, startDate: '2026-02-30' })).not.toBeNull();
  });
});

describe('跨日與全天行程', () => {
  it('跨日行程出現在涵蓋的每一天', () => {
    const e = makeEvent({ startDate: '2026-11-30', startTime: '20:00', endDate: '2026-12-02', endTime: '10:00' });
    expect(eventOccursOn(e, '2026-11-29')).toBe(false);
    expect(eventOccursOn(e, '2026-11-30')).toBe(true);
    expect(eventOccursOn(e, '2026-12-01')).toBe(true);
    expect(eventOccursOn(e, '2026-12-02')).toBe(true);
    expect(eventOccursOn(e, '2026-12-03')).toBe(false);
  });

  it('跨年行程', () => {
    const e = makeEvent({ allDay: true, startTime: null, endTime: null, startDate: '2026-12-31', endDate: '2027-01-01' });
    expect(eventOccursOn(e, '2026-12-31')).toBe(true);
    expect(eventOccursOn(e, '2027-01-01')).toBe(true);
    expect(eventOccursOn(e, '2027-01-02')).toBe(false);
  });

  it('剛好在午夜結束的行程不佔用隔天', () => {
    const e = makeEvent({ startTime: '22:00', endDate: '2026-11-17', endTime: '00:00' });
    expect(eventOccursOn(e, '2026-11-16')).toBe(true);
    expect(eventOccursOn(e, '2026-11-17')).toBe(false);
  });

  it('每天佔用的時段', () => {
    const e = makeEvent({ startTime: '22:00', endDate: '2026-11-18', endTime: '02:00' });
    expect(getDaySegment(e, '2026-11-16')).toEqual({ startMin: 1320, endMin: 1440 });
    expect(getDaySegment(e, '2026-11-17')).toEqual({ startMin: 0, endMin: 1440 });
    expect(getDaySegment(e, '2026-11-18')).toEqual({ startMin: 0, endMin: 120 });
    expect(formatEventTimeOnDay(e, '2026-11-16')).toBe('22:00 起');
    expect(formatEventTimeOnDay(e, '2026-11-17')).toBe('全天');
    expect(formatEventTimeOnDay(e, '2026-11-18')).toBe('至 02:00');
  });
});

describe('當日行程', () => {
  it('全天優先，其餘依開始時間排序', () => {
    const late = makeEvent({ startTime: '18:00', endTime: '19:00' });
    const early = makeEvent({ startTime: '10:00', endTime: '12:00' });
    const allDay = makeEvent({ allDay: true, startTime: null, endTime: null });
    const other = makeEvent({ startDate: '2026-11-17', endDate: '2026-11-17' });
    expect(getEventsOnDay([late, early, allDay, other], '2026-11-16').map((e) => e.id)).toEqual([allDay.id, early.id, late.id]);
  });

  it('進行中判斷', () => {
    const e = makeEvent();
    expect(isEventOngoing(e, new Date(2026, 10, 16, 13, 59))).toBe(false);
    expect(isEventOngoing(e, new Date(2026, 10, 16, 14, 0))).toBe(true);
    expect(isEventOngoing(e, new Date(2026, 10, 16, 14, 59))).toBe(true);
    expect(isEventOngoing(e, new Date(2026, 10, 16, 15, 0))).toBe(false);
    const allDay = makeEvent({ allDay: true, startTime: null, endTime: null });
    expect(isEventOngoing(allDay, new Date(2026, 10, 16, 23, 59))).toBe(true);
    expect(isEventOngoing(allDay, new Date(2026, 10, 17, 0, 0))).toBe(false);
  });
});

describe('週/日檢視排版', () => {
  it('重疊的行程並排，不重疊的各自佔滿', () => {
    const a = makeEvent({ startTime: '09:00', endTime: '11:00' });
    const b = makeEvent({ startTime: '10:00', endTime: '12:00' });
    const c = makeEvent({ startTime: '14:00', endTime: '15:00' });
    const layout = layoutTimedEvents([a, b, c], '2026-11-16');
    const byId = Object.fromEntries(layout.map((l) => [l.event.id, l]));
    expect(byId[a.id]).toMatchObject({ col: 0, cols: 2 });
    expect(byId[b.id]).toMatchObject({ col: 1, cols: 2 });
    expect(byId[c.id]).toMatchObject({ col: 0, cols: 1 });
  });

  it('全天行程不進入時間格', () => {
    const allDay = makeEvent({ allDay: true, startTime: null, endTime: null });
    expect(layoutTimedEvents([allDay], '2026-11-16')).toHaveLength(0);
  });
});
