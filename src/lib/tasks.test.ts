import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import {
  filterTasks,
  getCompletionPercent,
  getDayStats,
  groupTasksByDate,
  isOverdue,
  isTodayTask,
  sortTasks,
  toggleTaskStatus,
} from './tasks';

let seq = 0;
function makeTask(overrides: Partial<Task> = {}): Task {
  seq += 1;
  const createdAt = new Date(2026, 10, 1, 9, 0, seq).toISOString();
  return {
    id: `t${seq}`,
    title: `任務 ${seq}`,
    description: '',
    status: 'todo',
    priority: 'medium',
    categoryId: 'cat-other',
    dueDate: null,
    dueTime: null,
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    ...overrides,
  };
}

const NOW = new Date(2026, 10, 16, 9, 0); // 2026-11-16 09:00（本地）
const TODAY = '2026-11-16';

describe('任務狀態切換', () => {
  it('完成時記錄 completedAt', () => {
    const done = toggleTaskStatus(makeTask(), NOW);
    expect(done.status).toBe('completed');
    expect(done.completedAt).toBe(NOW.toISOString());
    expect(done.updatedAt).toBe(NOW.toISOString());
  });

  it('取消完成時清除 completedAt', () => {
    const done = toggleTaskStatus(makeTask(), NOW);
    const undone = toggleTaskStatus(done, new Date(2026, 10, 16, 10, 0));
    expect(undone.status).toBe('todo');
    expect(undone.completedAt).toBeNull();
  });

  it('不會修改原本的物件', () => {
    const task = makeTask();
    toggleTaskStatus(task, NOW);
    expect(task.status).toBe('todo');
    expect(task.completedAt).toBeNull();
  });
});

describe('逾期判斷', () => {
  it('只有日期的任務，當天結束前不算逾期', () => {
    const task = makeTask({ dueDate: TODAY });
    expect(isOverdue(task, new Date(2026, 10, 16, 23, 59, 59))).toBe(false);
    expect(isOverdue(task, new Date(2026, 10, 17, 0, 0, 0))).toBe(true);
  });

  it('有時間的任務，超過該時間才算逾期', () => {
    const task = makeTask({ dueDate: TODAY, dueTime: '14:00' });
    expect(isOverdue(task, new Date(2026, 10, 16, 13, 59))).toBe(false);
    expect(isOverdue(task, new Date(2026, 10, 16, 14, 0))).toBe(false);
    expect(isOverdue(task, new Date(2026, 10, 16, 14, 1))).toBe(true);
  });

  it('已完成或沒有日期的任務不會逾期', () => {
    expect(isOverdue(makeTask({ dueDate: '2026-11-01', status: 'completed', completedAt: NOW.toISOString() }), NOW)).toBe(false);
    expect(isOverdue(makeTask(), NOW)).toBe(false);
  });

  it('跨年逾期', () => {
    expect(isOverdue(makeTask({ dueDate: '2026-12-31' }), new Date(2027, 0, 1, 0, 0))).toBe(true);
  });
});

describe('今日任務歸屬', () => {
  it('截止日為今天的任務屬於今天', () => {
    expect(isTodayTask(makeTask({ dueDate: TODAY }), TODAY)).toBe(true);
    expect(isTodayTask(makeTask({ dueDate: '2026-11-17' }), TODAY)).toBe(false);
    expect(isTodayTask(makeTask(), TODAY)).toBe(false);
  });

  it('今天完成的逾期任務也算今天的成果', () => {
    const done = toggleTaskStatus(makeTask({ dueDate: '2026-11-10' }), NOW);
    expect(isTodayTask(done, TODAY)).toBe(true);
    expect(isTodayTask(done, '2026-11-17')).toBe(false);
  });

  it('接近午夜完成的任務仍歸屬本地當天', () => {
    const done = toggleTaskStatus(makeTask(), new Date(2026, 10, 16, 23, 50));
    expect(isTodayTask(done, TODAY)).toBe(true);
    const early = toggleTaskStatus(makeTask(), new Date(2026, 10, 16, 0, 10));
    expect(isTodayTask(early, TODAY)).toBe(true);
  });
});

describe('完成率', () => {
  it('沒有任務時為 0 而不是 NaN', () => {
    expect(getCompletionPercent(0, 0)).toBe(0);
    expect(getDayStats([], TODAY)).toEqual({ total: 0, done: 0, remaining: 0, percent: 0 });
  });

  it('已完成 / 總數 × 100%', () => {
    expect(getCompletionPercent(2, 5)).toBe(40);
    expect(getCompletionPercent(1, 3)).toBe(33);
    expect(getCompletionPercent(3, 3)).toBe(100);
  });

  it('統計今日任務', () => {
    const tasks = [
      makeTask({ dueDate: TODAY }),
      makeTask({ dueDate: TODAY }),
      toggleTaskStatus(makeTask({ dueDate: TODAY }), NOW),
      makeTask({ dueDate: '2026-11-17' }),
    ];
    expect(getDayStats(tasks, TODAY)).toEqual({ total: 3, done: 1, remaining: 2, percent: 33 });
  });
});

describe('排序', () => {
  it('高優先級優先，其次截止時間', () => {
    const low = makeTask({ priority: 'low', dueDate: TODAY });
    const high = makeTask({ priority: 'high', dueDate: '2026-11-18' });
    const mediumLate = makeTask({ priority: 'medium', dueDate: TODAY, dueTime: '18:00' });
    const mediumEarly = makeTask({ priority: 'medium', dueDate: TODAY, dueTime: '09:00' });
    expect(sortTasks([low, mediumLate, high, mediumEarly]).map((t) => t.id)).toEqual([
      high.id,
      mediumEarly.id,
      mediumLate.id,
      low.id,
    ]);
  });

  it('依日期排序時沒有日期的任務排最後', () => {
    const none = makeTask();
    const later = makeTask({ dueDate: '2026-12-01' });
    const sooner = makeTask({ dueDate: '2026-11-17' });
    expect(sortTasks([none, later, sooner], 'dueDate').map((t) => t.id)).toEqual([sooner.id, later.id, none.id]);
  });

  it('已完成的任務排在未完成之後', () => {
    const done = toggleTaskStatus(makeTask({ priority: 'high' }), NOW);
    const todo = makeTask({ priority: 'low' });
    expect(sortTasks([done, todo]).map((t) => t.id)).toEqual([todo.id, done.id]);
  });
});

describe('篩選', () => {
  const today = makeTask({ dueDate: TODAY, priority: 'high', categoryId: 'cat-study' });
  const tomorrow = makeTask({ dueDate: '2026-11-17' });
  const inWeek = makeTask({ dueDate: '2026-11-23' });
  const far = makeTask({ dueDate: '2026-12-25' });
  const overdue = makeTask({ dueDate: '2026-11-10' });
  const noDate = makeTask();
  const done = toggleTaskStatus(makeTask({ dueDate: TODAY }), NOW);
  const all = [today, tomorrow, inWeek, far, overdue, noDate, done];
  const ids = (list: Task[]) => list.map((t) => t.id).sort();

  it('今天 / 明天 / 未來 7 天', () => {
    expect(ids(filterTasks(all, { filter: 'today', showCompleted: false }, NOW))).toEqual(ids([today]));
    expect(ids(filterTasks(all, { filter: 'today' }, NOW))).toEqual(ids([today, done]));
    expect(ids(filterTasks(all, { filter: 'tomorrow' }, NOW))).toEqual(ids([tomorrow]));
    expect(ids(filterTasks(all, { filter: 'next7', showCompleted: false }, NOW))).toEqual(ids([today, tomorrow, inWeek]));
  });

  it('已逾期只包含尚未完成的任務', () => {
    expect(ids(filterTasks(all, { filter: 'overdue' }, NOW))).toEqual(ids([overdue]));
  });

  it('已完成', () => {
    expect(ids(filterTasks(all, { filter: 'completed', showCompleted: false }, NOW))).toEqual(ids([done]));
  });

  it('全部任務可隱藏已完成', () => {
    expect(filterTasks(all, { filter: 'all' }, NOW)).toHaveLength(7);
    expect(filterTasks(all, { filter: 'all', showCompleted: false }, NOW)).toHaveLength(6);
  });

  it('可再依分類與優先級篩選', () => {
    expect(ids(filterTasks(all, { filter: 'all', categoryId: 'cat-study' }, NOW))).toEqual(ids([today]));
    expect(ids(filterTasks(all, { filter: 'all', priority: 'high' }, NOW))).toEqual(ids([today]));
    expect(filterTasks(all, { filter: 'tomorrow', priority: 'high' }, NOW)).toHaveLength(0);
  });
});

describe('依日期分組（行事曆同步用）', () => {
  it('每個任務只出現在自己的日期，沒有日期的不出現', () => {
    const a = makeTask({ dueDate: '2026-11-20' });
    const b = makeTask({ dueDate: '2026-11-20', priority: 'high' });
    const c = makeTask();
    const map = groupTasksByDate([a, b, c]);
    expect([...map.keys()]).toEqual(['2026-11-20']);
    expect(map.get('2026-11-20')!.map((t) => t.id)).toEqual([b.id, a.id]);
  });
});
