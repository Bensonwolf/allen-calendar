import { AlignLeft, Clock, MapPin, Pencil, Tag, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useEventActions } from '../../hooks/useActions';
import { OTHER_CATEGORY_ID } from '../../lib/defaults';
import { formatEventRange, getEventColor } from '../../lib/events';
import { useAppStore } from '../../store';
import { useUI } from '../../store/uiStore';
import { Modal } from '../ui/Modal';

export function EventDetailHost() {
  const id = useUI((s) => s.eventDetailId);
  const close = useUI((s) => s.closeEventDetail);
  const event = useAppStore((s) => (id ? s.events.find((e) => e.id === id) : undefined));
  const categories = useAppStore((s) => s.categories);
  const actions = useEventActions();

  // 行程在別處被刪除時自動關閉
  useEffect(() => {
    if (id && !event) close();
  }, [id, event, close]);

  if (!id || !event) return null;
  const category = categories.find((c) => c.id === event.categoryId) ?? categories.find((c) => c.id === OTHER_CATEGORY_ID);

  return (
    <Modal
      title="行程內容"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-ghost mr-auto hover:text-red-500" onClick={() => actions.remove(event, close)}>
            <Trash2 size={15} />
            刪除
          </button>
          <button type="button" className="btn btn-outline" onClick={() => actions.edit(event)}>
            <Pencil size={15} />
            編輯
          </button>
        </>
      }
    >
      <div className="space-y-3 pb-2">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: getEventColor(event, categories) }} />
          <h3 className="min-w-0 break-words text-lg font-semibold leading-snug">{event.title}</h3>
        </div>
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-start gap-3">
            <Clock size={16} className="mt-0.5 shrink-0 text-faint" />
            <dd>{formatEventRange(event)}</dd>
          </div>
          {category && (
            <div className="flex items-start gap-3">
              <Tag size={16} className="mt-0.5 shrink-0 text-faint" />
              <dd>{category.name}</dd>
            </div>
          )}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="mt-0.5 shrink-0 text-faint" />
              <dd className="min-w-0 break-words">{event.location}</dd>
            </div>
          )}
          {event.notes && (
            <div className="flex items-start gap-3">
              <AlignLeft size={16} className="mt-0.5 shrink-0 text-faint" />
              <dd className="min-w-0 whitespace-pre-wrap break-words text-muted">{event.notes}</dd>
            </div>
          )}
        </dl>
      </div>
    </Modal>
  );
}
