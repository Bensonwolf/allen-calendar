import type { DateKey, Priority, Task } from '../types';
import { addDaysKey, combineDateTime, fromDateKey, timestampToDateKey, toDateKey } from './date';

export const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
export const PRIORITY_LABEL: Record<Priority, string> = { high: '高', medium: '中', low: '低' };
export const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

export type TaskFilter = 'all' | 'today' | 'tomorrow' | 'next7' | 'overdue' | 'completed';
export type TaskSort = 'priority' | 'dueDate' | 'createdAt';

export const FILTER_LABEL: Record<TaskFilter, string> = {
  all: '全部任務',
  today: '今天',
  tomorrow: '明天',
  next7: '未來 7 天',
  overdue: '已逾期',
  completed: '已完成',
};

/**
 * 任務的截止瞬間。
 * - 有時間：該日期時間。
 * - 只有日期：當天結束（隔天 00:00）。
 * - 沒有日期：null（永不逾期）。
 */
export function getTaskDeadline(task: Pick<Task, 'dueDate' | 'dueTime'>): Date | null {
  if (!task.dueDate) return null;
  if (task.dueTime) return combineDateTime(task.dueDate, task.dueTime);
  return fromDateKey(addDaysKey(task.dueDate, 1));
}

export function isOverdue(task: Task, now: Date): boolean {
  if (task.status !== 'todo') return false;
  const deadline = getTaskDeadline(task);
  if (!deadline) return false;
  return task.dueTime ? now.getTime() > deadline.getTime() : now.getTime() >= deadline.getTime();
}

/**
 * 「今日任務」的歸屬規則：
 * 1. 截止日期是今天的任務（不論是否完成）。
 * 2. 在今天完成的任務（例如今天補完的逾期任務、提前完成的任務、沒有日期的任務）。
 */
export function isTodayTask(task: Task, today: DateKey): boolean {
  if (task.dueDate === today) return true;
  return task.status === 'completed' && !!task.completedAt && timestampToDateKey(task.completedAt) === today;
}

function compareNullableLast(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

function compareByDue(a: Task, b: Task): number {
  return compareNullableLast(a.dueDate, b.dueDate) || compareNullableLast(a.dueTime, b.dueTime);
}

export function sortTasks(tasks: Task[], sort: TaskSort = 'priority'): Task[] {
  const list = [...tasks];
  list.sort((a, b) => {
    // 尚未完成的任務永遠排在已完成之前
    if (a.status !== b.status) return a.status === 'todo' ? -1 : 1;
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    const byCreated = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
    if (sort === 'dueDate') return compareByDue(a, b) || byPriority || byCreated;
    if (sort === 'createdAt') return -byCreated || byPriority;
    return byPriority || compareByDue(a, b) || byCreated;
  });
  return list;
}

export interface TaskQuery {
  filter: TaskFilter;
  categoryId?: string | null;
  priority?: Priority | null;
  /** 在非「已完成」篩選中是否包含已完成任務 */
  showCompleted?: boolean;
}

export function filterTasks(tasks: Task[], query: TaskQuery, now: Date): Task[] {
  const today = toDateKey(now);
  const tomorrow = addDaysKey(today, 1);
  const weekEnd = addDaysKey(today, 7);
  const { filter, categoryId, priority, showCompleted = true } = query;

  return tasks.filter((t) => {
    if (categoryId && t.categoryId !== categoryId) return false;
    if (priority && t.priority !== priority) return false;
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'overdue') return isOverdue(t, now);
    if (t.status === 'completed' && !showCompleted) return false;
    switch (filter) {
      case 'today':
        return t.dueDate === today;
      case 'tomorrow':
        return t.dueDate === tomorrow;
      case 'next7':
        return t.dueDate !== null && t.dueDate >= today && t.dueDate <= weekEnd;
      default:
        return true;
    }
  });
}

/** 切換完成狀態：完成時記錄 completedAt，取消完成時清除。 */
export function toggleTaskStatus(task: Task, now: Date): Task {
  const iso = now.toISOString();
  return task.status === 'todo'
    ? { ...task, status: 'completed', completedAt: iso, updatedAt: iso }
    : { ...task, status: 'todo', completedAt: null, updatedAt: iso };
}

export interface DayStats {
  total: number;
  done: number;
  remaining: number;
  /** 0–100 的整數；沒有任務時為 0（不會是 NaN） */
  percent: number;
}

export function getCompletionPercent(done: number, total: number): number {
  if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

export function getDayStats(tasks: Task[], today: DateKey): DayStats {
  const todays = tasks.filter((t) => isTodayTask(t, today));
  const done = todays.filter((t) => t.status === 'completed').length;
  return {
    total: todays.length,
    done,
    remaining: todays.length - done,
    percent: getCompletionPercent(done, todays.length),
  };
}

export function groupTasksByDate(tasks: Task[]): Map<DateKey, Task[]> {
  const map = new Map<DateKey, Task[]>();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const list = map.get(t.dueDate);
    if (list) list.push(t);
    else map.set(t.dueDate, [t]);
  }
  for (const [key, list] of map) map.set(key, sortTasks(list, 'priority'));
  return map;
}
