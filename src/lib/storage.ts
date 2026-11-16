import type { AppData, CalendarEvent, Category, Task, UserSettings } from '../types';
import { isValidDateKey, isValidTime, isValidTimestamp } from './date';
import { CURRENT_VERSION, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, OTHER_CATEGORY_ID, createDefaultData } from './defaults';
import { validateEventTimes } from './events';

export const STORAGE_KEY = 'allen-calendar:data';
export const CORRUPT_BACKUP_KEY = 'allen-calendar:corrupt-backup';
export const APP_ID = 'allen-calendar';

/* ------------------------------------------------------------------ */
/* 驗證與正規化                                                         */
/* ------------------------------------------------------------------ */

export type ParseResult = { ok: true; data: AppData } | { ok: false; error: string };

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function fail(message: string): never {
  throw new Error(message);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function reqString(v: unknown, what: string): string {
  if (typeof v !== 'string' || v.trim() === '') fail(`${what}不可為空`);
  return v as string;
}

function optString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function timestampOr(v: unknown, fallback: string): string {
  return isValidTimestamp(v) ? v : fallback;
}

function parseCategory(v: unknown, i: number): Category {
  const where = `第 ${i + 1} 個分類`;
  if (!isObject(v)) fail(`${where}格式不正確`);
  return {
    id: reqString(v.id, `${where}的 id`),
    name: reqString(v.name, `${where}的名稱`).trim(),
    color: typeof v.color === 'string' && COLOR_RE.test(v.color) ? v.color : '#64748b',
  };
}

function parseTask(v: unknown, i: number, categoryIds: Set<string>, now: string): Task {
  const where = `第 ${i + 1} 筆任務`;
  if (!isObject(v)) fail(`${where}格式不正確`);
  const title = reqString(v.title, `${where}的標題`).trim();
  if (v.status !== 'todo' && v.status !== 'completed') fail(`${where}的狀態不正確`);
  if (v.priority !== 'high' && v.priority !== 'medium' && v.priority !== 'low') fail(`${where}的優先級不正確`);
  if (v.dueDate != null && !isValidDateKey(v.dueDate)) fail(`${where}的日期格式不正確`);
  if (v.dueTime != null && !isValidTime(v.dueTime)) fail(`${where}的時間格式不正確`);
  if (v.completedAt != null && !isValidTimestamp(v.completedAt)) fail(`${where}的完成時間格式不正確`);
  const dueDate = (v.dueDate as string | null | undefined) ?? null;
  const createdAt = timestampOr(v.createdAt, now);
  const updatedAt = timestampOr(v.updatedAt, createdAt);
  return {
    id: reqString(v.id, `${where}的 id`),
    title,
    description: optString(v.description),
    status: v.status,
    priority: v.priority,
    categoryId: typeof v.categoryId === 'string' && categoryIds.has(v.categoryId) ? v.categoryId : OTHER_CATEGORY_ID,
    dueDate,
    dueTime: dueDate ? ((v.dueTime as string | null | undefined) ?? null) : null,
    createdAt,
    updatedAt,
    // 狀態與 completedAt 必須一致
    completedAt: v.status === 'completed' ? ((v.completedAt as string | null | undefined) ?? updatedAt) : null,
  };
}

function parseEvent(v: unknown, i: number, categoryIds: Set<string>, now: string): CalendarEvent {
  const where = `第 ${i + 1} 筆行程`;
  if (!isObject(v)) fail(`${where}格式不正確`);
  const title = reqString(v.title, `${where}的標題`).trim();
  const allDay = v.allDay === true;
  const times = {
    startDate: v.startDate as string,
    startTime: allDay ? null : ((v.startTime as string | null) ?? null),
    endDate: v.endDate as string,
    endTime: allDay ? null : ((v.endTime as string | null) ?? null),
    allDay,
  };
  const timeError = validateEventTimes(times);
  if (timeError) fail(`${where}：${timeError}`);
  const createdAt = timestampOr(v.createdAt, now);
  return {
    id: reqString(v.id, `${where}的 id`),
    title,
    ...times,
    categoryId: typeof v.categoryId === 'string' && categoryIds.has(v.categoryId) ? v.categoryId : OTHER_CATEGORY_ID,
    color: typeof v.color === 'string' && COLOR_RE.test(v.color) ? v.color : null,
    location: optString(v.location),
    notes: optString(v.notes),
    createdAt,
    updatedAt: timestampOr(v.updatedAt, createdAt),
  };
}

function parseSettings(v: unknown): UserSettings {
  if (!isObject(v)) return { ...DEFAULT_SETTINGS };
  return {
    theme: v.theme === 'dark' || v.theme === 'light' ? v.theme : DEFAULT_SETTINGS.theme,
    defaultCalendarView:
      v.defaultCalendarView === 'month' || v.defaultCalendarView === 'week' || v.defaultCalendarView === 'day'
        ? v.defaultCalendarView
        : DEFAULT_SETTINGS.defaultCalendarView,
    weekStartsOn: v.weekStartsOn === 0 || v.weekStartsOn === 1 ? v.weekStartsOn : DEFAULT_SETTINGS.weekStartsOn,
    showCompleted: typeof v.showCompleted === 'boolean' ? v.showCompleted : DEFAULT_SETTINGS.showCompleted,
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

/**
 * 舊版資料升級的掛載點。之後資料結構有變動時，
 * 在這裡依 version 逐版轉換，再交給 parseAppData 驗證。
 */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  return raw;
}

/**
 * 驗證並正規化未知來源的資料（LocalStorage 內容或匯入的 JSON）。
 * 任何一筆資料無效就整份拒絕，不會回傳半套資料。
 */
export function parseAppData(input: unknown): ParseResult {
  try {
    if (!isObject(input)) fail('檔案內容不是有效的備份格式');
    if (typeof input.version !== 'number' || !Number.isInteger(input.version) || input.version < 1) {
      fail('缺少資料版本（version）欄位');
    }
    if (input.version > CURRENT_VERSION) fail('這份資料來自較新版本的 Allen Calendar，無法讀取');
    const raw = migrate(input);

    if (!Array.isArray(raw.tasks)) fail('缺少任務清單（tasks）');
    if (!Array.isArray(raw.events)) fail('缺少行程清單（events）');
    if (!Array.isArray(raw.categories)) fail('缺少分類清單（categories）');

    const now = new Date().toISOString();
    const categories = uniqueById((raw.categories as unknown[]).map(parseCategory));
    if (!categories.some((c) => c.id === OTHER_CATEGORY_ID)) {
      categories.push({ ...DEFAULT_CATEGORIES.find((c) => c.id === OTHER_CATEGORY_ID)! });
    }
    const categoryIds = new Set(categories.map((c) => c.id));

    return {
      ok: true,
      data: {
        version: CURRENT_VERSION,
        tasks: uniqueById((raw.tasks as unknown[]).map((t, i) => parseTask(t, i, categoryIds, now))),
        events: uniqueById((raw.events as unknown[]).map((e, i) => parseEvent(e, i, categoryIds, now))),
        categories,
        settings: parseSettings(raw.settings),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '資料格式不正確' };
  }
}

/* ------------------------------------------------------------------ */
/* Repository                                                          */
/* ------------------------------------------------------------------ */

export type LoadStatus = 'ok' | 'empty' | 'corrupt' | 'unavailable';

export interface LoadResult {
  status: LoadStatus;
  data: AppData;
  error?: string;
}

/**
 * 資料存取介面。畫面與狀態管理只依賴這個介面，
 * 之後要換成 Supabase 或其他資料庫時，實作同一個介面即可。
 */
export interface DataRepository {
  load(): LoadResult;
  /** 儲存成功回傳 true；失敗（例如容量已滿）回傳 false，不拋出例外。 */
  save(data: AppData): boolean;
  clear(): boolean;
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export class LocalStorageRepository implements DataRepository {
  constructor(
    private readonly storage: StorageLike | null,
    private readonly key: string = STORAGE_KEY,
  ) {}

  load(): LoadResult {
    if (!this.storage) return { status: 'unavailable', data: createDefaultData(), error: '瀏覽器不允許使用本機儲存空間' };
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return { status: 'unavailable', data: createDefaultData(), error: '無法讀取本機儲存空間' };
    }
    if (raw === null || raw.trim() === '') return { status: 'empty', data: createDefaultData() };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return this.handleCorrupt(raw, '儲存的資料不是有效的 JSON');
    }
    const result = parseAppData(parsed);
    if (!result.ok) return this.handleCorrupt(raw, result.error);
    return { status: 'ok', data: result.data };
  }

  save(data: AppData): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  clear(): boolean {
    if (!this.storage) return false;
    try {
      this.storage.removeItem(this.key);
      return true;
    } catch {
      return false;
    }
  }

  /** 資料損壞時把原始內容另存一份，避免下次存檔時直接覆蓋掉。 */
  private handleCorrupt(raw: string, error: string): LoadResult {
    try {
      this.storage?.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      // 備份失敗也不影響啟動
    }
    return { status: 'corrupt', data: createDefaultData(), error };
  }
}

/** 記憶體版 Repository：測試用，也可作為 LocalStorage 無法使用時的備援。 */
export class MemoryRepository implements DataRepository {
  private data: AppData | null;
  failSave = false;

  constructor(initial: AppData | null = null) {
    this.data = initial;
  }

  load(): LoadResult {
    return this.data ? { status: 'ok', data: structuredClone(this.data) } : { status: 'empty', data: createDefaultData() };
  }

  save(data: AppData): boolean {
    if (this.failSave) return false;
    this.data = structuredClone(data);
    return true;
  }

  clear(): boolean {
    this.data = null;
    return true;
  }
}

export function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 匯出 / 匯入                                                          */
/* ------------------------------------------------------------------ */

export function exportToJson(data: AppData, now: Date = new Date()): string {
  return JSON.stringify({ app: APP_ID, exportedAt: now.toISOString(), ...data }, null, 2);
}

export function importFromJson(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: '檔案不是有效的 JSON 格式' };
  }
  return parseAppData(parsed);
}
