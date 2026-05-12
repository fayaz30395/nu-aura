'use client';

/**
 * Survey Analytics — per-question chart subtree.
 *
 * Extracted into a separate module so the recharts bundle (~180 KB gz) is
 * lazy-loaded via `next/dynamic({ ssr: false })` from the parent page. Keeps
 * the route's initial JS small for the (common) case where the user lands on
 * a survey with text-only responses or empty analytics.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {chartColors} from '@/lib/design-system';

export interface SurveyBarDatum {
  name: string;
  count: number;
}

export interface SurveyPieDatum {
  name: string;
  value: number;
}

export function SurveyBarChart({data}: { data: SurveyBarDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid}/>
        <XAxis
          dataKey="name"
          tick={{fontSize: 12, fill: chartColors.tooltip.text}}
        />
        <YAxis
          allowDecimals={false}
          tick={{fontSize: 12, fill: chartColors.tooltip.text}}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: chartColors.tooltip.bg,
            border: `1px solid ${chartColors.tooltip.border}`,
            borderRadius: 8,
            color: chartColors.tooltip.text,
          }}
        />
        <Bar
          dataKey="count"
          fill={chartColors.primary}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SurveyPieChart({data, colors}: { data: SurveyPieDatum[]; colors: string[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({name, percent}) =>
            `${name} (${(percent * 100).toFixed(0)}%)`
          }
          outerRadius={80}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
            />
          ))}
        </Pie>
        <Legend/>
        <Tooltip
          contentStyle={{
            backgroundColor: chartColors.tooltip.bg,
            border: `1px solid ${chartColors.tooltip.border}`,
            borderRadius: 8,
            color: chartColors.tooltip.text,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
