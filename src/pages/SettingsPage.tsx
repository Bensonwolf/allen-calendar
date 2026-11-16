import { format } from 'date-fns';
import { Download, Moon, Plus, Sun, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { PageHeader, Switch } from '../components/ui/primitives';
import { COLOR_PALETTE, OTHER_CATEGORY_ID } from '../lib/defaults';
import { exportToJson, importFromJson } from '../lib/storage';
import { useAppStore } from '../store';
import { useUI } from '../store/uiStore';
import type { CalendarView, Category } from '../types';

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-faint">{description}</p>}
      <div className="mt-4 divide-y divide-line">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const updateCategory = useAppStore((s) => s.updateCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const usage = useAppStore(
    (s) => s.tasks.filter((t) => t.categoryId === category.id).length + s.events.filter((e) => e.categoryId === category.id).length,
  );
  const toast = useUI((s) => s.toast);
  const askConfirm = useUI((s) => s.askConfirm);
  const [name, setName] = useState(category.name);
  const isOther = category.id === OTHER_CATEGORY_ID;

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(category.name);
      return;
    }
    if (trimmed !== category.name) {
      updateCategory(category.id, { name: trimmed });
      toast('已更新分類名稱');
    }
    setName(trimmed);
  };

  const remove = () =>
    askConfirm({
      title: '刪除分類',
      message:
        usage > 0
          ? `確定要刪除「${category.name}」嗎？這個分類底下的 ${usage} 筆任務與行程不會被刪除，會移到「其他」。`
          : `確定要刪除「${category.name}」嗎？`,
      confirmLabel: '刪除',
      danger: true,
      onConfirm: () => {
        if (deleteCategory(category.id)) toast('已刪除分類');
      },
    });

  return (
    <li className="flex items-center gap-2 py-2">
      <label
        className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-surface2"
        title="變更顏色"
      >
        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} />
        <input
          type="color"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          value={category.color}
          onChange={(e) => updateCategory(category.id, { color: e.target.value })}
          aria-label={`${category.name}的顏色`}
        />
      </label>
      <input
        className="input min-w-0 flex-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
        }}
        maxLength={20}
        aria-label="分類名稱"
      />
      <span className="hidden w-16 shrink-0 text-right text-xs tabular-nums text-faint sm:block">{usage} 筆</span>
      <button
        type="button"
        className="icon-btn hover:text-red-500 disabled:pointer-events-none disabled:opacity-30"
        onClick={remove}
        disabled={isOther}
        title={isOther ? '「其他」是預設分類，無法刪除' : '刪除分類'}
        aria-label={`刪除分類：${category.name}`}
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}

function CategoryManager() {
  const categories = useAppStore((s) => s.categories);
  const addCategory = useAppStore((s) => s.addCategory);
  const toast = useUI((s) => s.toast);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[3]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.name === trimmed)) {
      toast(`已經有「${trimmed}」這個分類`, 'error');
      return;
    }
    if (addCategory(trimmed, color)) {
      toast(`已新增分類「${trimmed}」`);
      setName('');
      setColor(COLOR_PALETTE[(COLOR_PALETTE.indexOf(color) + 1) % COLOR_PALETTE.length] ?? COLOR_PALETTE[0]);
    }
  };

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">分類</h2>
      <p className="mt-0.5 text-xs text-faint">點色塊可以變更顏色；刪除分類時，底下的任務與行程會移到「其他」</p>
      <ul className="mt-3">
        {categories.map((c) => (
          <CategoryRow key={`${c.id}:${c.name}`} category={c} />
        ))}
      </ul>
      <form onSubmit={submit} className="mt-2 flex items-center gap-2 border-t border-line pt-4">
        <label className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-surface2" title="選擇顏色">
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
          <input
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="新分類的顏色"
          />
        </label>
        <input
          className="input min-w-0 flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="新分類名稱"
          maxLength={20}
          aria-label="新分類名稱"
        />
        <button type="submit" className="btn btn-outline" disabled={!name.trim()}>
          <Plus size={15} />
          新增
        </button>
      </form>
    </section>
  );
}

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const taskCount = useAppStore((s) => s.tasks.length);
  const eventCount = useAppStore((s) => s.events.length);
  const toast = useUI((s) => s.toast);
  const askConfirm = useUI((s) => s.askConfirm);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportToJson(useAppStore.getState().getSnapshot());
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `allen-calendar-backup-${format(new Date(), 'yyyyMMdd-HHmm')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('已匯出備份檔');
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允許再次選擇同一個檔案
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast('無法讀取檔案', 'error');
      return;
    }
    const result = importFromJson(text);
    if (!result.ok) {
      toast(`匯入失敗：${result.error}。原有資料沒有變動。`, 'error');
      return;
    }
    const { data } = result;
    askConfirm({
      title: '匯入資料',
      message: `備份檔包含 ${data.tasks.length} 筆任務、${data.events.length} 筆行程與 ${data.categories.length} 個分類。匯入後會取代目前所有資料與設定，確定要繼續嗎？`,
      confirmLabel: '匯入並取代',
      onConfirm: () => {
        useAppStore.getState().replaceAll(data);
        toast('已匯入資料');
      },
    });
  };

  const handleClear = () =>
    askConfirm({
      title: '清除所有資料',
      message: `這會刪除全部 ${taskCount} 筆任務、${eventCount} 筆行程、自訂分類與設定。建議先匯出備份。`,
      confirmLabel: '繼續',
      danger: true,
      onConfirm: () =>
        askConfirm({
          title: '再次確認',
          message: '清除後無法復原。真的要清除所有資料嗎？',
          confirmLabel: '清除所有資料',
          danger: true,
          onConfirm: () => {
            useAppStore.getState().clearAll();
            toast('已清除所有資料');
          },
        }),
    });

  const views: { value: CalendarView; label: string }[] = [
    { value: 'month', label: '月' },
    { value: 'week', label: '週' },
    { value: 'day', label: '日' },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="設定" subtitle="所有設定都會自動儲存在這台裝置的瀏覽器中" />
      <div className="space-y-5">
        <Section title="外觀">
          <Row label="主題">
            <div className="segmented">
              <button type="button" aria-pressed={settings.theme === 'light'} onClick={() => updateSettings({ theme: 'light' })} className="flex items-center gap-1.5">
                <Sun size={14} />
                淺色
              </button>
              <button type="button" aria-pressed={settings.theme === 'dark'} onClick={() => updateSettings({ theme: 'dark' })} className="flex items-center gap-1.5">
                <Moon size={14} />
                深色
              </button>
            </div>
          </Row>
        </Section>

        <Section title="行事曆與待辦">
          <Row label="預設行事曆檢視" hint="進入行事曆頁面時先顯示的檢視方式">
            <div className="segmented">
              {views.map((v) => (
                <button key={v.value} type="button" aria-pressed={settings.defaultCalendarView === v.value} onClick={() => updateSettings({ defaultCalendarView: v.value })}>
                  {v.label}
                </button>
              ))}
            </div>
          </Row>
          <Row label="每週起始日">
            <div className="segmented">
              <button type="button" aria-pressed={settings.weekStartsOn === 1} onClick={() => updateSettings({ weekStartsOn: 1 })}>
                星期一
              </button>
              <button type="button" aria-pressed={settings.weekStartsOn === 0} onClick={() => updateSettings({ weekStartsOn: 0 })}>
                星期日
              </button>
            </div>
          </Row>
          <Row label="顯示已完成任務" hint="關閉後，行事曆與待辦清單會隱藏已完成的任務（「已完成」頁面與今日總覽不受影響）">
            <Switch checked={settings.showCompleted} onChange={(showCompleted) => updateSettings({ showCompleted })} label="顯示已完成任務" />
          </Row>
        </Section>

        <CategoryManager />

        <Section title="資料" description={`目前有 ${taskCount} 筆任務、${eventCount} 筆行程，儲存在這個瀏覽器的 LocalStorage`}>
          <Row label="匯出資料" hint="下載包含任務、行程、分類與設定的 JSON 備份檔">
            <button type="button" className="btn btn-outline" onClick={handleExport}>
              <Download size={15} />
              匯出 JSON
            </button>
          </Row>
          <Row label="匯入資料" hint="從備份檔還原；格式不正確時不會變動現有資料">
            <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()}>
              <Upload size={15} />
              匯入 JSON
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
          </Row>
          <Row label="清除所有資料" hint="刪除所有任務、行程、分類與設定，無法復原">
            <button type="button" className="btn border border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400" onClick={handleClear}>
              <Trash2 size={15} />
              清除資料
            </button>
          </Row>
        </Section>

        <p className="pb-2 text-center text-xs text-faint">Allen Calendar・DayFlow v1.0.0　快捷鍵：N 新增任務・Ctrl/⌘ + K 搜尋・Esc 關閉視窗</p>
      </div>
    </div>
  );
}
