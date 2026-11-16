import { Check, Moon, PanelLeft, PanelLeftClose, Plus, Search, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useNow } from '../../hooks/useNow';
import { useShortcuts } from '../../hooks/useShortcuts';
import { formatFullDate } from '../../lib/date';
import { useAppStore } from '../../store';
import { useUI } from '../../store/uiStore';
import { EventDetailHost } from '../events/EventDetail';
import { EventFormHost } from '../events/EventForm';
import { SearchDialogHost } from '../SearchDialog';
import { TaskDetailHost } from '../tasks/TaskDetail';
import { TaskFormHost } from '../tasks/TaskForm';
import { ConfirmDialog, Toasts } from '../ui/Overlays';
import { NAV_ITEMS } from './nav';

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
        <Check size={18} strokeWidth={3} />
      </span>
      {!compact && <span className="text-[17px] font-semibold tracking-tight">DayFlow</span>}
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const now = useNow();
  const [datePart, weekday] = formatFullDate(now).split('，');

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 md:flex ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'justify-between px-5'}`}>
        <Logo compact={collapsed} />
        {!collapsed && (
          <button type="button" className="icon-btn -mr-2" onClick={onToggle} aria-label="收合側邊欄">
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="主要導覽">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex h-10 items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                collapsed ? 'justify-center' : 'px-3'
              } ${isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface2 hover:text-ink'}`
            }
          >
            <item.icon size={18} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {collapsed ? (
        <div className="flex justify-center pb-4">
          <button type="button" className="icon-btn" onClick={onToggle} aria-label="展開側邊欄">
            <PanelLeft size={18} />
          </button>
        </div>
      ) : (
        <div className="border-t border-line px-5 py-4">
          <p className="text-xs text-faint">今天</p>
          <p className="mt-0.5 text-sm font-medium">{datePart}</p>
          <p className="text-xs text-muted">{weekday}</p>
        </div>
      )}
    </aside>
  );
}

function TopBar() {
  const openSearch = useUI((s) => s.openSearch);
  const theme = useAppStore((s) => s.settings.theme);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:h-16 md:px-6">
      <div className="md:hidden">
        <Logo />
      </div>
      <button
        type="button"
        onClick={openSearch}
        className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-line bg-app px-3 text-sm text-faint transition-colors hover:border-faint md:ml-0 md:w-80"
        aria-label="開啟搜尋"
      >
        <Search size={16} className="shrink-0" />
        <span className="hidden flex-1 text-left sm:block">搜尋任務、行程…</span>
        <kbd className="hidden rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] md:block">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <button
        type="button"
        className="icon-btn md:ml-auto"
        onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
        aria-label={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}

function MobileNav() {
  return (
    <nav
      className="flex shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="主要導覽"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              isActive ? 'text-primary' : 'text-faint'
            }`
          }
        >
          <item.icon size={20} />
          <span className="truncate">{item.shortLabel}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Layout() {
  useShortcuts();
  // 寬螢幕預設展開、平板預設收合；使用者手動切換後以使用者的選擇為準
  const [isWide, setIsWide] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const collapsed = userCollapsed ?? !isWide;
  const setCollapsed = (update: (current: boolean) => boolean) => setUserCollapsed(update(collapsed));

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      setIsWide(query.matches);
      setUserCollapsed(null);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const openTaskForm = useUI((s) => s.openTaskForm);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // 換頁時回到頂端
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex h-dvh overflow-hidden bg-app text-ink">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-5 md:px-6 md:pb-10 md:pt-7">
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </div>

      {location.pathname !== '/settings' && (
        <button
          type="button"
          onClick={() => openTaskForm()}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-pop transition-transform active:scale-95 md:hidden"
          aria-label="新增任務"
        >
          <Plus size={26} />
        </button>
      )}

      <SearchDialogHost />
      <EventDetailHost />
      <TaskDetailHost />
      <TaskFormHost />
      <EventFormHost />
      <ConfirmDialog />
      <Toasts />
    </div>
  );
}
