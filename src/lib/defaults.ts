import type { AppData, Category, UserSettings } from '../types';

export const CURRENT_VERSION = 1;
export const OTHER_CATEGORY_ID = 'cat-other';

export const COLOR_PALETTE = [
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#64748b',
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-study', name: '課業', color: '#3b82f6' },
  { id: 'cat-research', name: '研究', color: '#8b5cf6' },
  { id: 'cat-work', name: '工作', color: '#f97316' },
  { id: 'cat-life', name: '生活', color: '#22c55e' },
  { id: OTHER_CATEGORY_ID, name: '其他', color: '#64748b' },
];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  defaultCalendarView: 'month',
  weekStartsOn: 1,
  showCompleted: true,
};

export function createDefaultData(): AppData {
  return {
    version: CURRENT_VERSION,
    tasks: [],
    events: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}
