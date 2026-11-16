import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md';
  /** 疊在其他視窗之上（確認視窗用） */
  elevated?: boolean;
}

/** 桌面置中、手機從底部滑出的對話框。Esc 由全域快捷鍵統一處理。 */
export function Modal({ title, onClose, children, footer, size = 'md', elevated = false }: ModalProps) {
  return createPortal(
    <div
      className={`fixed inset-0 flex items-end justify-center sm:items-center sm:p-4 ${elevated ? 'z-[60]' : 'z-50'}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 animate-fade bg-black/40" onClick={onClose} />
      <div
        className={`relative flex max-h-[92dvh] w-full animate-pop flex-col rounded-t-2xl border border-line bg-surface shadow-pop sm:rounded-2xl ${
          size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          <button type="button" className="icon-btn -mr-2" onClick={onClose} aria-label="關閉">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
