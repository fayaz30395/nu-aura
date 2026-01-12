// Type definitions for UI Components

// Button Types
export type ButtonVariant = 
  | 'default'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg';

// Badge Types
export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'outline';

export type BadgeSize = 'sm' | 'md' | 'lg';

// Input Types
export type InputVariant = 'default' | 'filled';

// StatCard Types
export type StatCardVariant = 
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive';

export interface TrendData {
  value: number;
  isPositive: boolean;
  label?: string;
}

// Sidebar Types
export type SidebarVariant = 'default' | 'compact' | 'minimal';

export interface SidebarItemBase {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface SidebarItemWithHref extends SidebarItemBase {
  href: string;
  onClick?: never;
  children?: SidebarItem[];
}

export interface SidebarItemWithClick extends SidebarItemBase {
  onClick: () => void;
  href?: never;
  children?: never;
}

export interface SidebarItemWithChildren extends SidebarItemBase {
  children: SidebarItem[];
  href?: never;
  onClick?: never;
}

export type SidebarItem = 
  | SidebarItemWithHref 
  | SidebarItemWithClick 
  | SidebarItemWithChildren;
