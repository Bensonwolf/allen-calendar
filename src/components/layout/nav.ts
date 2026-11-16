import { CalendarDays, CheckCircle2, LayoutDashboard, ListTodo, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '今日總覽', shortLabel: '總覽', icon: LayoutDashboard },
  { to: '/calendar', label: '行事曆', shortLabel: '行事曆', icon: CalendarDays },
  { to: '/tasks', label: '待辦事項', shortLabel: '待辦', icon: ListTodo },
  { to: '/completed', label: '已完成', shortLabel: '已完成', icon: CheckCircle2 },
  { to: '/settings', label: '設定', shortLabel: '設定', icon: Settings },
];
