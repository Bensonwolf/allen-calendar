import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAppStore } from '../../store';
import { useUI } from '../../store/uiStore';
import type { DateKey } from '../../types';

interface QuickAddProps {
  /** 新任務的日期；null 代表不指定日期 */
  date: DateKey | null;
  placeholder?: string;
}

/** 只輸入名稱、按 Enter 就新增的快速輸入列。 */
export function QuickAdd({ date, placeholder = '新增任務，按 Enter 送出' }: QuickAddProps) {
  const [title, setTitle] = useState('');
  const addTask = useAppStore((s) => s.addTask);
  const toast = useUI((s) => s.toast);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const task = addTask({ title, dueDate: date });
    if (task) {
      setTitle('');
      toast(`已新增「${task.title}」`);
    }
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Plus size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          className="input pl-9"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          maxLength={200}
          aria-label="快速新增任務"
          enterKeyHint="done"
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
        新增
      </button>
    </form>
  );
}
