import { create } from 'zustand';
import type { DateKey, TimeString } from '../types';

export interface TaskFormState {
  /** 有值代表編輯既有任務 */
  taskId?: string;
  /** 新增時的預設日期；undefined 代表使用「目前選取日期或今天」 */
  dueDate?: DateKey | null;
}

export interface EventFormState {
  eventId?: string;
  date?: DateKey;
  time?: TimeString;
}

export interface ConfirmState {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface UIState {
  taskForm: TaskFormState | null;
  eventForm: EventFormState | null;
  eventDetailId: string | null;
  taskDetailId: string | null;
  confirm: ConfirmState | null;
  searchOpen: boolean;
  toasts: Toast[];
  /** 行事曆目前選取的日期（離開行事曆頁時為 null） */
  selectedDate: DateKey | null;

  openTaskForm(state?: TaskFormState): void;
  closeTaskForm(): void;
  openEventForm(state?: EventFormState): void;
  closeEventForm(): void;
  openEventDetail(id: string): void;
  closeEventDetail(): void;
  openTaskDetail(id: string): void;
  closeTaskDetail(): void;
  askConfirm(state: ConfirmState): void;
  closeConfirm(): void;
  openSearch(): void;
  closeSearch(): void;
  /** 關閉最上層的視窗；有關閉任何東西時回傳 true。 */
  closeTop(): boolean;
  isAnyOpen(): boolean;
  toast(message: string, kind?: ToastKind): void;
  dismissToast(id: number): void;
  setSelectedDate(date: DateKey | null): void;
}

let toastSeq = 0;
const TOAST_MS = 3200;

export const useUI = create<UIState>()((set, get) => ({
  taskForm: null,
  eventForm: null,
  eventDetailId: null,
  taskDetailId: null,
  confirm: null,
  searchOpen: false,
  toasts: [],
  selectedDate: null,

  openTaskForm: (state = {}) => set({ taskForm: state, taskDetailId: null, searchOpen: false }),
  openTaskDetail: (id) => set({ taskDetailId: id, searchOpen: false }),
  closeTaskDetail: () => set({ taskDetailId: null }),
  closeTaskForm: () => set({ taskForm: null }),
  openEventForm: (state = {}) => set({ eventForm: state, eventDetailId: null, searchOpen: false }),
  closeEventForm: () => set({ eventForm: null }),
  openEventDetail: (id) => set({ eventDetailId: id, searchOpen: false }),
  closeEventDetail: () => set({ eventDetailId: null }),
  askConfirm: (state) => set({ confirm: state }),
  closeConfirm: () => set({ confirm: null }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),

  closeTop() {
    const s = get();
    if (s.confirm) set({ confirm: null });
    else if (s.taskForm) set({ taskForm: null });
    else if (s.eventForm) set({ eventForm: null });
    else if (s.eventDetailId) set({ eventDetailId: null });
    else if (s.taskDetailId) set({ taskDetailId: null });
    else if (s.searchOpen) set({ searchOpen: false });
    else return false;
    return true;
  },

  isAnyOpen() {
    const s = get();
    return !!(s.confirm || s.taskForm || s.eventForm || s.eventDetailId || s.taskDetailId || s.searchOpen);
  },

  toast(message, kind = 'success') {
    const id = ++toastSeq;
    // 最多同時顯示 3 則，避免連續操作時堆滿畫面
    set({ toasts: [...get().toasts.slice(-2), { id, message, kind }] });
    setTimeout(() => get().dismissToast(id), TOAST_MS);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
