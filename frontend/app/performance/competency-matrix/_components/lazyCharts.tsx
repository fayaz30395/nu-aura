'use client';

import dynamic from 'next/dynamic';
import {Skeleton} from '@mantine/core';

// Recharts uses browser-only SVG/ResizeObserver APIs — lazy-load so the recharts
// bundle stays out of the initial page JS.
const ChartSkeleton = () => <Skeleton height={280} radius="md" aria-label="Loading chart"/>;

export const GapAnalysisRadarChart = dynamic(
  () => import('../CompetencyCharts').then(m => ({default: m.GapAnalysisRadarChart})),
  {ssr: false, loading: ChartSkeleton}
);

export const CompetencyHeatmapChart = dynamic(
  () => import('../CompetencyCharts').then(m => ({default: m.CompetencyHeatmapChart})),
  {ssr: false, loading: ChartSkeleton}
);
