'use client';

import dynamic from 'next/dynamic';
import {ComponentType, ReactNode} from 'react';
import {Skeleton} from '@/components/ui/Skeleton';

/**
 * Loading component for lazy-loaded components
 */
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-pulse flex space-x-4">
      <div className="h-10 w-10 bg-surface-200 rounded-full"/>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-200 rounded w-3/4"/>
        <div className="h-4 bg-surface-200 rounded w-1/2"/>
      </div>
    </div>
  </div>
);

/**
 * Chart loading skeleton
 */
export const ChartLoadingFallback = () => (
  <div className="h-[300px] w-full card-aura p-6" aria-hidden="true">
    <div className="row-between mb-6">
      <div className="skeleton-aura h-5 w-32 rounded"/>
      <div className="skeleton-aura h-8 w-24 rounded-lg"/>
    </div>
    <div className="flex items-end gap-2 h-[calc(100%-4rem)]">
      {[65, 45, 80, 55, 70, 40, 75].map((h, i) => (
        <div key={i} className="skeleton-aura flex-1 rounded-t" style={{height: `${h}%`}}/>
      ))}
    </div>
  </div>
);

/**
 * Table loading skeleton
 */
const _TableLoadingFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-10 w-full"/>
    <Skeleton className="h-8 w-full"/>
    <Skeleton className="h-8 w-full"/>
    <Skeleton className="h-8 w-full"/>
    <Skeleton className="h-8 w-full"/>
  </div>
);

/**
 * Create a lazy-loaded component with custom loading fallback
 */
export function createLazyComponent<T extends ComponentType<object>>(
  importFn: () => Promise<{ default: T }>,
  LoadingComponent: ReactNode = <DefaultLoadingFallback/>
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
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

// ============ Additional Loading Skeletons ============

/**
 * Editor loading skeleton for Tiptap-based editors
 */
export const EditorLoadingFallback = () => (
  <div
    className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] dark:border-surface-700 flex items-center justify-center"
    style={{minHeight: '300px'}}>
    <div className="space-y-4 w-full p-6">
      <Skeleton className="h-10 w-full rounded"/>
      <Skeleton className="h-4 w-3/4 rounded"/>
      <Skeleton className="h-4 w-1/2 rounded"/>
      <Skeleton className="h-4 w-5/6 rounded"/>
    </div>
  </div>
);

/**
 * Kanban board loading skeleton for drag-and-drop pages
 */
export const KanbanLoadingFallback = () => (
  <div className="flex gap-4 overflow-hidden p-4">
    {Array.from({length: 4}).map((_, i) => (
      <div key={i} className="flex-shrink-0 w-[240px] space-y-4">
        <Skeleton className="h-8 w-full rounded"/>
        <Skeleton className="h-24 w-full rounded"/>
        <Skeleton className="h-24 w-full rounded"/>
      </div>
    ))}
  </div>
);

// ============ Lazy-loaded Chart Components ============

/**
 * Lazy-loaded standalone chart components from components/charts/
 */
export const LazyAttendanceTrendChart = dynamic(
  () => import('@/components/charts/AttendanceTrendChart').then((mod) => ({default: mod.AttendanceTrendChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

export const LazyLeaveDistributionChart = dynamic(
  () => import('@/components/charts/LeaveDistributionChart').then((mod) => ({default: mod.LeaveDistributionChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

export const LazyPayrollCostTrendChart = dynamic(
  () => import('@/components/charts/PayrollCostTrendChart').then((mod) => ({default: mod.PayrollCostTrendChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

export const LazyHeadcountTrendChart = dynamic(
  () => import('@/components/charts/HeadcountTrendChart').then((mod) => ({default: mod.HeadcountTrendChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

export const LazyDepartmentDistributionChart = dynamic(
  () => import('@/components/charts/DepartmentDistributionChart').then((mod) => ({default: mod.DepartmentDistributionChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

// ============ Lazy-loaded Rich Text Editor ============

/**
 * Lazy-loaded RichTextEditor (Tiptap + 17 extensions, ~200KB+ gzipped)
 */
export const LazyRichTextEditor = dynamic(
  () => import('@/components/fluence/RichTextEditor'),
  {loading: () => <EditorLoadingFallback/>, ssr: false}
);

