'use client';

import {useState} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';

export const EMPLOYEE_PAGE_SIZE = 20;

export interface EmployeeListState {
  searchQuery: string;
  statusFilter: string;
  currentPage: number;
  pageSize: number;
  setSearchQuery: (value: string) => void;
  setStatusFilter: (value: string) => void;
  setCurrentPage: (updater: number | ((prev: number) => number)) => void;
}

export function useEmployeeListState(): EmployeeListState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const parsedPageParam = Number(searchParams.get('page'));
  const urlPage = Number.isFinite(parsedPageParam) && parsedPageParam >= 1
    ? Math.floor(parsedPageParam)
    : 1;
  const currentPage = urlPage - 1;

  const setCurrentPage = (updater: number | ((prev: number) => number)) => {
    const next = typeof updater === 'function' ? updater(currentPage) : updater;
    const nextUrlPage = Math.max(1, next + 1);
    const params = new URLSearchParams(searchParams.toString());
    if (nextUrlPage <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(nextUrlPage));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return {
    searchQuery,
    statusFilter,
    currentPage,
    pageSize: EMPLOYEE_PAGE_SIZE,
    setSearchQuery,
    setStatusFilter,
    setCurrentPage,
  };
}
