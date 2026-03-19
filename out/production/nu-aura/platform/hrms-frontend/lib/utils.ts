import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}


export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Role-based permission helpers
export interface RoleWithPermissions {
  code?: string;
  name?: string;
  permissions?: { code?: string; name?: string }[];
}

export function isAdmin(roles?: RoleWithPermissions[]): boolean {
  if (!roles) return false;
  return roles.some(r =>
    r.code === 'SUPER_ADMIN' ||
    r.code === 'ADMIN' ||
    r.name === 'Super Admin' ||
    r.name === 'Admin' ||
    r.permissions?.some(p => p.code === 'SYSTEM:ADMIN')
  );
}

export function hasPermission(roles?: RoleWithPermissions[], permissionCode?: string): boolean {
  if (!roles || !permissionCode) return false;
  return roles.some(r =>
    r.permissions?.some(p => p.code === permissionCode)
  );
}
