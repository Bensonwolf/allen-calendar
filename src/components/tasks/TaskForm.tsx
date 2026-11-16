import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTaskActions } from '../../hooks/useActions';
import { toDateKey } from '../../lib/date';
import { OTHER_CATEGORY_ID } from '../../lib/defaults';
import { PRIORITIES, PRIORITY_LABEL } from '../../lib/tasks';
import { useAppStore } from '../../store';
import { useUI, type TaskFormState } from '../../store/uiStore';
import type { Priority, Task } from '../../types';
import { Modal } from '../ui/Modal';
import { PRIORITY_DOT } from '../ui/primitives';

export function TaskFormHost() {
  const state = useUI((s) => s.taskForm);
  if (!state) return null;
  return <TaskForm key={state.taskId ?? 'new'} state={state} />;
}

function TaskForm({ state }: { state: TaskFormState }) {
  const close = useUI((s) => s.closeTaskForm);
  const toast = useUI((s) => s.toast);
  const selectedDate = useUI((s) => s.selectedDate);
  const categories = useAppStore((s) => s.categories);
  const actions = useTaskActions();
  const [existing] = useState<Task | undefined>(() =>
    state.taskId ? useAppStore.getState().tasks.find((t) => t.id === state.taskId) : undefined,
  );

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [dueDate, setDueDate] = useState<string>(() => {
    if (existing) return existing.dueDate ?? '';
    if (state.dueDate !== undefined) return state.dueDate ?? '';
    // 預設為目前選取的日期；沒有選取時為今天
    return selectedDate ?? toDateKey(new Date());
  });
  const [dueTime, setDueTime] = useState(existing?.dueTime ?? '');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'medium');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? OTHER_CATEGORY_ID);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('請輸入任務名稱');
      return;
    }
    const input = {
      title,
      description,
      priority,
      categoryId,
      dueDate: dueDate || null,
      dueTime: dueDate && dueTime ? dueTime : null,
    };
    const store = useAppStore.getState();
    if (existing) {
      if (!store.updateTask(existing.id, input)) {
        toast('找不到這個任務，可能已被刪除', 'error');
      } else {
        toast('已更新任務');
      }
    } else if (store.addTask(input)) {
      toast(`已新增「${title.trim()}」`);
    }
    close();
  };

  return (
    <Modal title={existing ? '編輯任務' : '新增任務'} onClose={close}>
      <form onSubmit={submit} className="space-y-4 pb-1" noValidate>
        <div>
          <label className="label" htmlFor="task-title">
            任務名稱
          </label>
          <input
            id="task-title"
            className="input"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder="例如：完成研究報告"
            maxLength={200}
            autoFocus
            aria-invalid={!!error}
          />
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>

        <div>
          <label className="label" htmlFor="task-desc">
            描述（選填）
          </label>
          <textarea
            id="task-desc"
            className="input min-h-[72px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="補充細節、連結或備註"
            maxLength={2000}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="task-date">
              日期
            </label>
            <input id="task-date" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="task-time">
              時間（選填）
            </label>
            <input
              id="task-time"
              type="time"
              className="input"
              value={dueDate ? dueTime : ''}
              onChange={(e) => setDueTime(e.target.value)}
              disabled={!dueDate}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="label">優先級</span>
            <div className="segmented w-full">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={priority === p}
                  onClick={() => setPriority(p)}
                  className="flex flex-1 items-center justify-center gap-1.5"
                >
                  <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[p]}`} />
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="task-category">
              分類
            </label>
            <select id="task-category" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {existing ? (
            <button type="button" className="btn btn-ghost hover:text-red-500" onClick={() => actions.remove(existing, close)}>
              <Trash2 size={15} />
              刪除
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={close}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {existing ? '儲存' : '新增任務'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
