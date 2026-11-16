import { Check } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { minutesToTime, nextHour, timeToMinutes, toDateKey } from '../../lib/date';
import { COLOR_PALETTE, OTHER_CATEGORY_ID } from '../../lib/defaults';
import { getCategoryColor, validateEventTimes } from '../../lib/events';
import { useAppStore } from '../../store';
import { useUI, type EventFormState } from '../../store/uiStore';
import type { CalendarEvent, EventInput } from '../../types';
import { Modal } from '../ui/Modal';
import { Switch } from '../ui/primitives';

export function EventFormHost() {
  const state = useUI((s) => s.eventForm);
  if (!state) return null;
  return <EventForm key={state.eventId ?? 'new'} state={state} />;
}

interface FormValues {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  categoryId: string;
  color: string | null;
  location: string;
  notes: string;
}

function plusOneHour(time: string): string {
  return minutesToTime(timeToMinutes(time) + 60);
}

function EventForm({ state }: { state: EventFormState }) {
  const close = useUI((s) => s.closeEventForm);
  const toast = useUI((s) => s.toast);
  const selectedDate = useUI((s) => s.selectedDate);
  const categories = useAppStore((s) => s.categories);
  const [existing] = useState<CalendarEvent | undefined>(() =>
    state.eventId ? useAppStore.getState().events.find((e) => e.id === state.eventId) : undefined,
  );

  const [values, setValues] = useState<FormValues>(() => {
    if (existing) {
      const fallbackStart = '09:00';
      return {
        title: existing.title,
        startDate: existing.startDate,
        startTime: existing.startTime ?? fallbackStart,
        endDate: existing.endDate,
        endTime: existing.endTime ?? plusOneHour(fallbackStart),
        allDay: existing.allDay,
        categoryId: existing.categoryId,
        color: existing.color,
        location: existing.location,
        notes: existing.notes,
      };
    }
    const now = new Date();
    const date = state.date ?? selectedDate ?? toDateKey(now);
    const startTime = state.time ?? nextHour(now);
    return {
      title: '',
      startDate: date,
      startTime,
      endDate: date,
      endTime: plusOneHour(startTime),
      allDay: false,
      categoryId: OTHER_CATEGORY_ID,
      color: null,
      location: '',
      notes: '',
    };
  });
  const [errors, setErrors] = useState<{ title?: string; time?: string }>({});

  const patch = (p: Partial<FormValues>) => {
    setValues((v) => ({ ...v, ...p }));
    setErrors({});
  };

  const onStartDate = (startDate: string) => {
    // 開始日期往後移時，結束日期跟著移，避免出現結束早於開始
    patch({ startDate, endDate: values.endDate < startDate || values.endDate === values.startDate ? startDate : values.endDate });
  };

  const onStartTime = (startTime: string) => {
    const next: Partial<FormValues> = { startTime };
    if (startTime && values.startDate === values.endDate && values.endTime <= startTime) next.endTime = plusOneHour(startTime);
    patch(next);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!values.title.trim()) nextErrors.title = '請輸入行程標題';
    const input: EventInput = {
      ...values,
      startTime: values.allDay ? null : values.startTime,
      endTime: values.allDay ? null : values.endTime,
    };
    const timeError = validateEventTimes(input);
    if (timeError) nextErrors.time = timeError;
    if (nextErrors.title || nextErrors.time) {
      setErrors(nextErrors);
      return;
    }
    const store = useAppStore.getState();
    const saved = existing ? store.updateEvent(existing.id, input) : store.addEvent(input);
    if (!saved) {
      toast(existing ? '找不到這個行程，可能已被刪除' : '無法新增行程，請檢查內容', 'error');
    } else {
      toast(existing ? '已更新行程' : `已新增行程「${saved.title}」`);
    }
    close();
  };

  const categoryColor = getCategoryColor(values.categoryId, categories);

  return (
    <Modal title={existing ? '編輯行程' : '新增行程'} onClose={close}>
      <form onSubmit={submit} className="space-y-4 pb-1" noValidate>
        <div>
          <label className="label" htmlFor="event-title">
            行程標題
          </label>
          <input
            id="event-title"
            className="input"
            value={values.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="例如：實驗室 Meeting"
            maxLength={200}
            autoFocus
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title}</p>}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">全天行程</span>
          <Switch checked={values.allDay} onChange={(allDay) => patch({ allDay })} label="全天行程" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="event-start-date">
              開始日期
            </label>
            <input
              id="event-start-date"
              type="date"
              className="input"
              value={values.startDate}
              onChange={(e) => onStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="event-start-time">
              開始時間
            </label>
            <input
              id="event-start-time"
              type="time"
              className="input"
              value={values.allDay ? '' : values.startTime}
              onChange={(e) => onStartTime(e.target.value)}
              disabled={values.allDay}
            />
          </div>
          <div>
            <label className="label" htmlFor="event-end-date">
              結束日期
            </label>
            <input
              id="event-end-date"
              type="date"
              className="input"
              value={values.endDate}
              min={values.startDate}
              onChange={(e) => patch({ endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="event-end-time">
              結束時間
            </label>
            <input
              id="event-end-time"
              type="time"
              className="input"
              value={values.allDay ? '' : values.endTime}
              onChange={(e) => patch({ endTime: e.target.value })}
              disabled={values.allDay}
            />
          </div>
        </div>
        {errors.time && (
          <p className="-mt-2 text-xs text-red-500" role="alert">
            {errors.time}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="event-category">
              分類
            </label>
            <select
              id="event-category"
              className="input"
              value={values.categoryId}
              onChange={(e) => patch({ categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="event-location">
              地點（選填）
            </label>
            <input
              id="event-location"
              className="input"
              value={values.location}
              onChange={(e) => patch({ location: e.target.value })}
              placeholder="例如：研究大樓 301"
              maxLength={200}
            />
          </div>
        </div>

        <div>
          <span className="label">顏色</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => patch({ color: null })}
              aria-pressed={values.color === null}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors ${
                values.color === null ? 'border-primary bg-primary-soft text-ink' : 'border-line text-muted hover:bg-surface2'
              }`}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryColor }} />
              跟隨分類
            </button>
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => patch({ color: c })}
                aria-pressed={values.color === c}
                aria-label={`顏色 ${c}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                style={{ backgroundColor: c }}
              >
                {values.color === c && <Check size={15} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="event-notes">
            備註（選填）
          </label>
          <textarea
            id="event-notes"
            className="input min-h-[72px] resize-y"
            value={values.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            maxLength={2000}
          />
        </div>

        <div className="flex justify-end gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <button type="button" className="btn btn-ghost" onClick={close}>
            取消
          </button>
          <button type="submit" className="btn btn-primary">
            {existing ? '儲存' : '新增行程'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
