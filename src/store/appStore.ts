import { create } from 'zustand';
import type { AppData, CalendarEvent, Category, EventInput, Task, TaskInput, UserSettings } from '../types';
import { isValidDateKey, isValidTime } from '../lib/date';
import { CURRENT_VERSION, OTHER_CATEGORY_ID, createDefaultData, createId } from '../lib/defaults';
import { validateEventTimes } from '../lib/events';
import type { DataRepository, LoadStatus } from '../lib/storage';
import { toggleTaskStatus } from '../lib/tasks';

export interface AppState {
  tasks: Task[];
  events: CalendarEvent[];
  categories: Category[];
  settings: UserSettings;
  /** 啟動時讀取資料的結果 */
  loadStatus: LoadStatus;
  /** 每次儲存失敗就 +1，畫面用它來顯示提示 */
  saveErrorCount: number;

  addTask(input: TaskInput): Task | null;
  updateTask(id: string, patch: Partial<TaskInput>): Task | null;
  deleteTask(id: string): boolean;
  toggleTask(id: string): Task | null;

  addEvent(input: EventInput): CalendarEvent | null;
  updateEvent(id: string, patch: Partial<EventInput>): CalendarEvent | null;
  deleteEvent(id: string): boolean;

  addCategory(name: string, color: string): Category | null;
  updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'color'>>): Category | null;
  /** 刪除分類；該分類的任務與行程會移到「其他」。「其他」本身不可刪除。 */
  deleteCategory(id: string): boolean;

  updateSettings(patch: Partial<UserSettings>): void;

  getSnapshot(): AppData;
  /** 以整份資料取代目前內容（匯入備份用）。 */
  replaceAll(data: AppData): void;
  /** 清除所有資料並回到初始狀態。 */
  clearAll(): void;
  /** 重新從儲存空間讀取（其他分頁修改資料時使用）。 */
  reload(): void;
}

type DataSlice = Pick<AppState, 'tasks' | 'events' | 'categories' | 'settings'>;

function normalizeEvent(input: EventInput): EventInput | null {
  const title = input.title.trim();
  if (!title) return null;
  const normalized: EventInput = {
    ...input,
    title,
    startTime: input.allDay ? null : input.startTime,
    endTime: input.allDay ? null : input.endTime,
    location: input.location.trim(),
    notes: input.notes.trim(),
  };
  return validateEventTimes(normalized) ? null : normalized;
}

export function createAppStore(repo: DataRepository) {
  const loaded = repo.load();

  return create<AppState>()((set, get) => {
    /** 更新狀態並立即寫入儲存空間。 */
    const commit = (partial: Partial<DataSlice>) => {
      set(partial);
      if (!repo.save(get().getSnapshot())) set({ saveErrorCount: get().saveErrorCount + 1 });
    };

    const validCategory = (id: string | undefined) =>
      id && get().categories.some((c) => c.id === id) ? id : OTHER_CATEGORY_ID;

    return {
      tasks: loaded.data.tasks,
      events: loaded.data.events,
      categories: loaded.data.categories,
      settings: loaded.data.settings,
      loadStatus: loaded.status,
      saveErrorCount: 0,

      addTask(input) {
        const title = input.title.trim();
        if (!title) return null;
        const now = new Date().toISOString();
        const dueDate = isValidDateKey(input.dueDate) ? input.dueDate : null;
        const task: Task = {
          id: createId(),
          title,
          description: input.description?.trim() ?? '',
          status: 'todo',
          priority: input.priority ?? 'medium',
          categoryId: validCategory(input.categoryId),
          dueDate,
          dueTime: dueDate && isValidTime(input.dueTime) ? input.dueTime : null,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        };
        commit({ tasks: [...get().tasks, task] });
        return task;
      },

      updateTask(id, patch) {
        const current = get().tasks.find((t) => t.id === id);
        if (!current) return null;
        const next: Task = { ...current };
        if (patch.title !== undefined) {
          const title = patch.title.trim();
          if (!title) return null;
          next.title = title;
        }
        if (patch.description !== undefined) next.description = patch.description.trim();
        if (patch.priority !== undefined) next.priority = patch.priority;
        if (patch.categoryId !== undefined) next.categoryId = validCategory(patch.categoryId);
        if (patch.dueDate !== undefined) next.dueDate = isValidDateKey(patch.dueDate) ? patch.dueDate : null;
        if (patch.dueTime !== undefined) next.dueTime = isValidTime(patch.dueTime) ? patch.dueTime : null;
        if (!next.dueDate) next.dueTime = null;
        next.updatedAt = new Date().toISOString();
        commit({ tasks: get().tasks.map((t) => (t.id === id ? next : t)) });
        return next;
      },

      deleteTask(id) {
        const tasks = get().tasks;
        if (!tasks.some((t) => t.id === id)) return false;
        commit({ tasks: tasks.filter((t) => t.id !== id) });
        return true;
      },

      toggleTask(id) {
        const current = get().tasks.find((t) => t.id === id);
        if (!current) return null;
        const next = toggleTaskStatus(current, new Date());
        commit({ tasks: get().tasks.map((t) => (t.id === id ? next : t)) });
        return next;
      },

      addEvent(input) {
        const normalized = normalizeEvent(input);
        if (!normalized) return null;
        const now = new Date().toISOString();
        const event: CalendarEvent = {
          ...normalized,
          categoryId: validCategory(normalized.categoryId),
          id: createId(),
          createdAt: now,
          updatedAt: now,
        };
        commit({ events: [...get().events, event] });
        return event;
      },

      updateEvent(id, patch) {
        const current = get().events.find((e) => e.id === id);
        if (!current) return null;
        const { id: _id, createdAt, updatedAt: _updatedAt, ...fields } = current;
        const normalized = normalizeEvent({ ...fields, ...patch });
        if (!normalized) return null;
        const next: CalendarEvent = {
          ...normalized,
          categoryId: validCategory(normalized.categoryId),
          id,
          createdAt,
          updatedAt: new Date().toISOString(),
        };
        commit({ events: get().events.map((e) => (e.id === id ? next : e)) });
        return next;
      },

      deleteEvent(id) {
        const events = get().events;
        if (!events.some((e) => e.id === id)) return false;
        commit({ events: events.filter((e) => e.id !== id) });
        return true;
      },

      addCategory(name, color) {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const category: Category = { id: createId(), name: trimmed, color };
        commit({ categories: [...get().categories, category] });
        return category;
      },

      updateCategory(id, patch) {
        const current = get().categories.find((c) => c.id === id);
        if (!current) return null;
        const next: Category = { ...current };
        if (patch.name !== undefined) {
          const name = patch.name.trim();
          if (!name) return null;
          next.name = name;
        }
        if (patch.color !== undefined) next.color = patch.color;
        commit({ categories: get().categories.map((c) => (c.id === id ? next : c)) });
        return next;
      },

      deleteCategory(id) {
        if (id === OTHER_CATEGORY_ID) return false;
        const { categories, tasks, events } = get();
        if (!categories.some((c) => c.id === id)) return false;
        commit({
          categories: categories.filter((c) => c.id !== id),
          tasks: tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: OTHER_CATEGORY_ID } : t)),
          events: events.map((e) => (e.categoryId === id ? { ...e, categoryId: OTHER_CATEGORY_ID } : e)),
        });
        return true;
      },

      updateSettings(patch) {
        commit({ settings: { ...get().settings, ...patch } });
      },

      getSnapshot() {
        const { tasks, events, categories, settings } = get();
        return { version: CURRENT_VERSION, tasks, events, categories, settings };
      },

      replaceAll(data) {
        commit({ tasks: data.tasks, events: data.events, categories: data.categories, settings: data.settings });
      },

      clearAll() {
        const fresh = createDefaultData();
        repo.clear();
        commit({ tasks: fresh.tasks, events: fresh.events, categories: fresh.categories, settings: fresh.settings });
      },

      reload() {
        const result = repo.load();
        if (result.status !== 'ok' && result.status !== 'empty') return;
        const { tasks, events, categories, settings } = result.data;
        set({ tasks, events, categories, settings });
      },
    };
  });
}
