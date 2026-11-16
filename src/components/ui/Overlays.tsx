import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useUI } from '../../store/uiStore';
import { Modal } from './Modal';

export function ConfirmDialog() {
  const confirm = useUI((s) => s.confirm);
  const closeConfirm = useUI((s) => s.closeConfirm);
  if (!confirm) return null;

  const handleConfirm = () => {
    // 先關閉再執行，讓 onConfirm 可以接著開啟下一個確認視窗（二次確認）
    closeConfirm();
    confirm.onConfirm();
  };

  return (
    <Modal
      title={confirm.title}
      onClose={closeConfirm}
      size="sm"
      elevated
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={closeConfirm}>
            取消
          </button>
          <button
            type="button"
            className={`btn ${confirm.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            autoFocus
          >
            {confirm.confirmLabel ?? '確定'}
          </button>
        </>
      }
    >
      <p className="pb-2 text-sm leading-relaxed text-muted">{confirm.message}</p>
    </Modal>
  );
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex max-w-full animate-fade-up items-center gap-2.5 rounded-xl border border-line bg-surface py-2.5 pl-3.5 pr-2 text-sm shadow-pop"
        >
          {t.kind === 'success' && <CheckCircle2 size={17} className="shrink-0 text-emerald-500" />}
          {t.kind === 'error' && <AlertCircle size={17} className="shrink-0 text-red-500" />}
          {t.kind === 'info' && <Info size={17} className="shrink-0 text-primary" />}
          <span className="min-w-0 break-words">{t.message}</span>
          <button
            type="button"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-faint hover:bg-surface2 hover:text-ink"
            onClick={() => dismiss(t.id)}
            aria-label="關閉提示"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
