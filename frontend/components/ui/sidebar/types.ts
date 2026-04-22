import type React from 'react';

export const SIDEBAR_WIDTH_EXPANDED = 256;
export const SIDEBAR_WIDTH_COLLAPSED = 72;
export const HEADER_HEIGHT = 64;

export const STORAGE_KEY_COLLAPSED = 'sidebar-collapsed';
export const STORAGE_KEY_COLLAPSED_SECTIONS = 'sidebar-collapsed-sections';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  badge?: string | number;
  onClick?: () => void;
  children?: SidebarItem[];
  disabled?: boolean;
  section?: string;
  requiredPermission?: string;
}

export interface SidebarSection {
  id: string;
  label: string;
  items: SidebarItem[];
}

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: SidebarItem[];
  sections?: SidebarSection[];
  activeId?: string;
  onItemClick?: (item: SidebarItem) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  collapsible?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
  logo?: React.ReactNode;
  logoCollapsed?: React.ReactNode;
  storageKeyPrefix?: string;
}
