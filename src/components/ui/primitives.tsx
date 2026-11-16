import { Check, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { PRIORITY_LABEL } from '../../lib/tasks';
import type { Priority } from '../../types';

export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface2 text-faint">
        <Icon size={20} />
      </div>
      <p className="text-sm font-medium text-muted">{title}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const PRIORITY_STYLE: Record<Priority, string> = {
  high: 'bg-red-500/10 text-red-600 dark:text-red-400',
  medium: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

export const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-orange-500',
  low: 'bg-blue-500',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_STYLE[priority]}`}>
      {PRIORITY_LABEL[priority]}優先
    </span>
  );
}

export function CategoryTag({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="max-w-[8rem] truncate">{name}</span>
    </span>
  );
}

/** 圓形勾選框；外圍留有足夠的觸控範圍。 */
export function TaskCheckbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="group/check -m-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
          checked ? 'animate-check border-primary bg-primary text-white' : 'border-faint group-hover/check:border-primary'
        }`}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
    </button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        checked ? 'bg-primary' : 'bg-line'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
