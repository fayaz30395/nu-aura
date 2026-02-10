'use client';

import dynamic from 'next/dynamic';
import { ComponentType, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Loading component for lazy-loaded components
 */
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-pulse flex space-x-4">
      <div className="h-10 w-10 bg-surface-200 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-200 rounded w-3/4" />
        <div className="h-4 bg-surface-200 rounded w-1/2" />
      </div>
    </div>
  </div>
);

/**
 * Chart loading skeleton
 */
const ChartLoadingFallback = () => (
  <div className="h-[300px] w-full animate-pulse bg-surface-100 rounded-lg flex items-center justify-center">
    <span className="text-surface-400">Loading chart...</span>
  </div>
);

/**
 * Table loading skeleton
 */
const TableLoadingFallback = () => (
  <div className="space-y-3 p-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-8 w-full" />
  </div>
);

/**
 * Create a lazy-loaded component with custom loading fallback
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  LoadingComponent: ReactNode = <DefaultLoadingFallback />
) {
  return dynamic(importFn, {
    loading: () => <>{LoadingComponent}</>,
    ssr: false,
  });
}

// ============ Lazy-loaded Heavy Components ============

/**
 * Lazy-loaded Recharts components for analytics pages
 */
export const LazyAreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  { loading: () => <ChartLoadingFallback />, ssr: false }
);

export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  { loading: () => <ChartLoadingFallback />, ssr: false }
);

export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { loading: () => <ChartLoadingFallback />, ssr: false }
);

export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  { loading: () => <ChartLoadingFallback />, ssr: false }
);

