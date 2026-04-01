'use client';

/**
 * CompetencyCharts — recharts chart components for the Competency Matrix page.
 *
 * Separate file so next/dynamic can code-split the recharts bundle away from
 * the initial page JS. Only loaded client-side (ssr: false).
 */

import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer,
} from 'recharts';

const BAR_COLORS = ['var(--chart-primary)', 'var(--chart-success)', 'var(--chart-secondary)', 'var(--chart-warning)', 'var(--chart-info)'];

// ─── Gap Analysis Radar ───────────────────────────────────────────────────────

interface RadarDataPoint {
  skill: string;
  current: number;
  required: number;
}

interface GapAnalysisRadarChartProps {
  data: RadarDataPoint[];
}

export function GapAnalysisRadarChart({ data }: GapAnalysisRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
        <Radar
          name="Current Level"
          dataKey="current"
          stroke="var(--chart-primary)"
          fill="var(--chart-primary)"
          fillOpacity={0.3}
        />
        <Radar
          name="Required Level"
          dataKey="required"
          stroke="var(--chart-danger)"
          fill="var(--chart-danger)"
          fillOpacity={0.1}
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Category Heatmap Bar Chart ───────────────────────────────────────────────

interface HeatmapDataPoint {
  category: string;
  avgLevel: number;
  count: number;
}

interface CompetencyHeatmapChartProps {
  data: HeatmapDataPoint[];
}

export function CompetencyHeatmapChart({ data }: CompetencyHeatmapChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => [`${value} avg`, 'Proficiency']} />
        <Bar dataKey="avgLevel" radius={[0, 4, 4, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
