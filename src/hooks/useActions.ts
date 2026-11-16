import { useMemo } from 'react';
import { useAppStore } from '../store';
import { useUI } from '../store/uiStore';
import type { CalendarEvent, Task } from '../types';

/** 任務的操作：包含 Toast 回饋與刪除確認，讓各個畫面行為一致。 */
export function useTaskActions() {
  return useMemo(
    () => ({
      toggle(task: Task) {
        const next = useAppStore.getState().toggleTask(task.id);
        if (!next) return;
        useUI.getState().toast(next.status === 'completed' ? `已完成「${next.title}」` : `已將「${next.title}」移回要做`);
      },
      open(task: Task) {
        useUI.getState().openTaskDetail(task.id);
      },
      edit(task: Task) {
        useUI.getState().openTaskForm({ taskId: task.id });
      },
      remove(task: Task, onDone?: () => void) {
        useUI.getState().askConfirm({
          title: '刪除任務',
          message: `確定要刪除「${task.title}」嗎？此操作無法復原。`,
          confirmLabel: '刪除',
          danger: true,
          onConfirm: () => {
            if (useAppStore.getState().deleteTask(task.id)) useUI.getState().toast('已刪除任務');
            onDone?.();
          },
        });
      },
    }),
    [],
  );
}

export function useEventActions() {
  return useMemo(
    () => ({
      open(event: CalendarEvent) {
        useUI.getState().openEventDetail(event.id);
      },
      edit(event: CalendarEvent) {
        useUI.getState().openEventForm({ eventId: event.id });
      },
      remove(event: CalendarEvent, onDone?: () => void) {
        useUI.getState().askConfirm({
          title: '刪除行程',
          message: `確定要刪除「${event.title}」嗎？此操作無法復原。`,
          confirmLabel: '刪除',
          danger: true,
          onConfirm: () => {
            if (useAppStore.getState().deleteEvent(event.id)) useUI.getState().toast('已刪除行程');
            onDone?.();
          },
        });
      },
    }),
    [],
  );
}
