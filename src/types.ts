/**
 * 資料模型
 *
 * 日期時間格式約定：
 * - DateKey   ：'yyyy-MM-dd' 的「本地日曆日期」字串，不帶時區。任務日期與行程日期都用這個格式，
 *               因此不會因為 UTC 轉換而跑到前一天或後一天。
 * - TimeString：'HH:mm' 24 小時制的本地時間字串。
 * - Timestamp ：ISO 8601 UTC 字串（Date.toISOString()），只用於 createdAt / updatedAt / completedAt
 *               這類「發生的瞬間」，顯示時再轉回本地時間。
 */
export type DateKey = string;
export type TimeString = string;
export type Timestamp = string;

export type TaskStatus = 'todo' | 'completed';
export type Priority = 'high' | 'medium' | 'low';

/** 任務：需要完成的事情，具有完成狀態。 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  categoryId: string;
  dueDate: DateKey | null;
  dueTime: TimeString | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
}

/** 行程：特定時間的安排，沒有完成狀態。 */
export interface CalendarEvent {
  id: string;
  title: string;
  startDate: DateKey;
  /** 全天行程為 null */
  startTime: TimeString | null;
  endDate: DateKey;
  /** 全天行程為 null */
  endTime: TimeString | null;
  allDay: boolean;
  categoryId: string;
  /** 自訂顏色；null 表示跟隨分類顏色 */
  color: string | null;
  location: string;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export type CalendarView = 'month' | 'week' | 'day';
export type ThemeMode = 'light' | 'dark';

export interface UserSettings {
  theme: ThemeMode;
  defaultCalendarView: CalendarView;
  /** 0 = 星期日，1 = 星期一 */
  weekStartsOn: 0 | 1;
  showCompleted: boolean;
}

/** 儲存在 LocalStorage 與備份檔中的完整資料（版本化）。 */
export interface AppData {
  version: number;
  tasks: Task[];
  events: CalendarEvent[];
  categories: Category[];
  settings: UserSettings;
}

export interface TaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  categoryId?: string;
  dueDate?: DateKey | null;
  dueTime?: TimeString | null;
}

export type EventInput = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>;
