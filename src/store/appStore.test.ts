import { describe, expect, it } from 'vitest';
import { OTHER_CATEGORY_ID } from '../lib/defaults';
import { groupTasksByDate } from '../lib/tasks';
import {
  CORRUPT_BACKUP_KEY,
  LocalStorageRepository,
  MemoryRepository,
  STORAGE_KEY,
  exportToJson,
  importFromJson,
  type StorageLike,
} from '../lib/storage';
import type { EventInput } from '../types';
import { createAppStore } from './appStore';

class FakeStorage implements StorageLike {
  map = new Map<string, string>();
  failWrites = false;
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const meeting: EventInput = {
  title: 'Meeting',
  startDate: '2026-11-25',
  startTime: '14:00',
  endDate: '2026-11-25',
  endTime: '15:00',
  allDay: false,
  categoryId: 'cat-work',
  color: null,
  location: '實驗室',
  notes: '',
};

describe('任務 CRUD 與狀態切換', () => {
  it('新增任務後立即保存，重新載入後仍存在', () => {
    const storage = new FakeStorage();
    const store = createAppStore(new LocalStorageRepository(storage));
    const task = store.getState().addTask({ title: '  完成研究報告 ', dueDate: '2026-11-16' });
    expect(task?.title).toBe('完成研究報告');
    expect(storage.getItem(STORAGE_KEY)).toContain('完成研究報告');

    const reloaded = createAppStore(new LocalStorageRepository(storage));
    expect(reloaded.getState().loadStatus).toBe('ok');
    expect(reloaded.getState().tasks).toHaveLength(1);
    expect(reloaded.getState().tasks[0].dueDate).toBe('2026-11-16');
  });

  it('標題空白時不會新增', () => {
    const store = createAppStore(new MemoryRepository());
    expect(store.getState().addTask({ title: '   ' })).toBeNull();
    expect(store.getState().tasks).toHaveLength(0);
  });

  it('完成狀態切換會記錄與清除 completedAt，且重新載入後保持', () => {
    const storage = new FakeStorage();
    const store = createAppStore(new LocalStorageRepository(storage));
    const task = store.getState().addTask({ title: 'A', dueDate: '2026-11-16' })!;

    const done = store.getState().toggleTask(task.id)!;
    expect(done.status).toBe('completed');
    expect(done.completedAt).not.toBeNull();
    const afterReload = createAppStore(new LocalStorageRepository(storage)).getState().tasks[0];
    expect(afterReload.status).toBe('completed');
    expect(afterReload.completedAt).toBe(done.completedAt);

    const undone = store.getState().toggleTask(task.id)!;
    expect(undone.status).toBe('todo');
    expect(undone.completedAt).toBeNull();
  });

  it('連續快速切換不會產生不一致的狀態', () => {
    const store = createAppStore(new MemoryRepository());
    const task = store.getState().addTask({ title: 'A' })!;
    for (let i = 0; i < 5; i++) store.getState().toggleTask(task.id);
    const t = store.getState().tasks[0];
    expect(t.status).toBe('completed');
    expect(t.completedAt).not.toBeNull();
    expect(store.getState().tasks).toHaveLength(1);
  });

  it('修改日期後任務只出現在新日期（行事曆同步、沒有重複資料）', () => {
    const store = createAppStore(new MemoryRepository());
    const task = store.getState().addTask({ title: '完成期末報告', dueDate: '2026-11-20', dueTime: '18:00' })!;
    expect([...groupTasksByDate(store.getState().tasks).keys()]).toEqual(['2026-11-20']);

    store.getState().updateTask(task.id, { dueDate: '2026-12-01' });
    const map = groupTasksByDate(store.getState().tasks);
    expect([...map.keys()]).toEqual(['2026-12-01']);
    expect(map.get('2026-12-01')![0].dueTime).toBe('18:00');
    expect(store.getState().tasks).toHaveLength(1);
  });

  it('移除日期時一併清除時間', () => {
    const store = createAppStore(new MemoryRepository());
    const task = store.getState().addTask({ title: 'A', dueDate: '2026-11-20', dueTime: '18:00' })!;
    const updated = store.getState().updateTask(task.id, { dueDate: null })!;
    expect(updated.dueDate).toBeNull();
    expect(updated.dueTime).toBeNull();
  });

  it('刪除任務', () => {
    const store = createAppStore(new MemoryRepository());
    const task = store.getState().addTask({ title: 'A' })!;
    expect(store.getState().deleteTask(task.id)).toBe(true);
    expect(store.getState().deleteTask(task.id)).toBe(false);
    expect(store.getState().tasks).toHaveLength(0);
  });
});

describe('行程 CRUD', () => {
  it('新增、修改、刪除', () => {
    const store = createAppStore(new MemoryRepository());
    const event = store.getState().addEvent(meeting)!;
    expect(event.startDate).toBe('2026-11-25');
    const updated = store.getState().updateEvent(event.id, { startDate: '2026-11-26', endDate: '2026-11-26' })!;
    expect(updated.startDate).toBe('2026-11-26');
    expect(updated.createdAt).toBe(event.createdAt);
    expect(store.getState().deleteEvent(event.id)).toBe(true);
    expect(store.getState().events).toHaveLength(0);
  });

  it('拒絕不合理的時間與空白標題', () => {
    const store = createAppStore(new MemoryRepository());
    expect(store.getState().addEvent({ ...meeting, endTime: '13:00' })).toBeNull();
    expect(store.getState().addEvent({ ...meeting, title: ' ' })).toBeNull();
    const event = store.getState().addEvent(meeting)!;
    expect(store.getState().updateEvent(event.id, { endDate: '2026-11-24' })).toBeNull();
    expect(store.getState().events[0].endDate).toBe('2026-11-25');
  });

  it('全天行程不保存時間', () => {
    const store = createAppStore(new MemoryRepository());
    const event = store.getState().addEvent({ ...meeting, allDay: true })!;
    expect(event.startTime).toBeNull();
    expect(event.endTime).toBeNull();
  });
});

describe('分類', () => {
  it('刪除分類時任務與行程移到「其他」而不是被刪除', () => {
    const store = createAppStore(new MemoryRepository());
    const cat = store.getState().addCategory('社團', '#ec4899')!;
    const task = store.getState().addTask({ title: 'A', categoryId: cat.id })!;
    const event = store.getState().addEvent({ ...meeting, categoryId: cat.id })!;
    expect(task.categoryId).toBe(cat.id);

    expect(store.getState().deleteCategory(cat.id)).toBe(true);
    expect(store.getState().tasks[0].categoryId).toBe(OTHER_CATEGORY_ID);
    expect(store.getState().events[0].categoryId).toBe(OTHER_CATEGORY_ID);
    expect(store.getState().events[0].id).toBe(event.id);
  });

  it('「其他」分類不可刪除', () => {
    const store = createAppStore(new MemoryRepository());
    expect(store.getState().deleteCategory(OTHER_CATEGORY_ID)).toBe(false);
    expect(store.getState().categories.some((c) => c.id === OTHER_CATEGORY_ID)).toBe(true);
  });

  it('不存在的分類會落到「其他」', () => {
    const store = createAppStore(new MemoryRepository());
    expect(store.getState().addTask({ title: 'A', categoryId: 'nope' })!.categoryId).toBe(OTHER_CATEGORY_ID);
  });
});

describe('儲存空間異常', () => {
  it('JSON 損壞時改用空白資料並備份原始內容', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, '{這不是 JSON');
    const store = createAppStore(new LocalStorageRepository(storage));
    expect(store.getState().loadStatus).toBe('corrupt');
    expect(store.getState().tasks).toEqual([]);
    expect(store.getState().categories.length).toBeGreaterThan(0);
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe('{這不是 JSON');
  });

  it('結構不正確的資料視為損壞', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, tasks: 'oops' }));
    expect(createAppStore(new LocalStorageRepository(storage)).getState().loadStatus).toBe('corrupt');
  });

  it('沒有資料時為空狀態', () => {
    const store = createAppStore(new LocalStorageRepository(new FakeStorage()));
    expect(store.getState().loadStatus).toBe('empty');
    expect(store.getState().settings.weekStartsOn).toBe(1);
  });

  it('儲存失敗時不會當掉，並累計錯誤次數', () => {
    const storage = new FakeStorage();
    const store = createAppStore(new LocalStorageRepository(storage));
    storage.failWrites = true;
    expect(store.getState().addTask({ title: 'A' })).not.toBeNull();
    expect(store.getState().saveErrorCount).toBe(1);
    expect(store.getState().tasks).toHaveLength(1);
  });

  it('LocalStorage 無法使用時仍可運作', () => {
    const store = createAppStore(new LocalStorageRepository(null));
    expect(store.getState().loadStatus).toBe('unavailable');
    expect(store.getState().addTask({ title: 'A' })).not.toBeNull();
  });
});

describe('備份：匯出 → 清除 → 匯入', () => {
  it('任務、行程、分類與設定完整還原', () => {
    const store = createAppStore(new MemoryRepository());
    const cat = store.getState().addCategory('社團', '#ec4899')!;
    const task = store.getState().addTask({ title: '完成研究報告', dueDate: '2026-11-16', priority: 'high', categoryId: cat.id })!;
    store.getState().toggleTask(task.id);
    store.getState().addTask({ title: '整理研究資料', dueDate: '2026-11-20', dueTime: '09:30' });
    store.getState().addEvent(meeting);
    store.getState().updateSettings({ theme: 'dark', weekStartsOn: 0, defaultCalendarView: 'week', showCompleted: false });

    const before = store.getState().getSnapshot();
    const json = exportToJson(before);

    store.getState().clearAll();
    expect(store.getState().tasks).toHaveLength(0);
    expect(store.getState().events).toHaveLength(0);
    expect(store.getState().settings.theme).toBe('light');
    expect(store.getState().categories.some((c) => c.id === cat.id)).toBe(false);

    const result = importFromJson(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    store.getState().replaceAll(result.data);
    expect(store.getState().getSnapshot()).toEqual(before);
  });

  it('拒絕無效的匯入內容', () => {
    expect(importFromJson('not json').ok).toBe(false);
    expect(importFromJson('[]').ok).toBe(false);
    expect(importFromJson('{"foo":1}').ok).toBe(false);
    expect(importFromJson(JSON.stringify({ version: 99, tasks: [], events: [], categories: [] })).ok).toBe(false);
    expect(importFromJson(JSON.stringify({ version: 1, tasks: [{ id: 'x' }], events: [], categories: [] })).ok).toBe(false);
    const badDate = { version: 1, events: [], categories: [], tasks: [{ id: 'x', title: 'A', status: 'todo', priority: 'low', dueDate: '2026-02-31' }] };
    expect(importFromJson(JSON.stringify(badDate)).ok).toBe(false);
    const badEvent = { version: 1, tasks: [], categories: [], events: [{ ...meeting, id: 'e', endTime: '10:00' }] };
    expect(importFromJson(JSON.stringify(badEvent)).ok).toBe(false);
  });

  it('匯入時修復可修復的問題：未知分類、狀態與完成時間不一致', () => {
    const data = {
      version: 1,
      events: [],
      categories: [],
      tasks: [
        { id: 'a', title: 'A', status: 'todo', priority: 'low', categoryId: 'ghost', dueDate: '2026-11-20', completedAt: '2026-11-01T00:00:00.000Z' },
      ],
    };
    const result = importFromJson(JSON.stringify(data));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.categories.map((c) => c.id)).toEqual([OTHER_CATEGORY_ID]);
    expect(result.data.tasks[0].categoryId).toBe(OTHER_CATEGORY_ID);
    expect(result.data.tasks[0].completedAt).toBeNull();
    expect(result.data.tasks[0].dueDate).toBe('2026-11-20');
    expect(result.data.settings.weekStartsOn).toBe(1);
  });
});
