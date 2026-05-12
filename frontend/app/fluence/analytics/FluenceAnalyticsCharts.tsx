'use client';

/**
 * NU-Fluence Analytics — Chart subtree.
 *
 * Extracted into a separate module so the recharts bundle (~180 KB gz incl. d3
 * deps) is lazy-loaded via `next/dynamic({ ssr: false })` from the parent page.
 * Keeps the Fluence Analytics route's First-Load JS lean for users who haven't
 * scrolled to the charts yet.
 */

import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {chartColors} from '@/lib/theme/design-system';

export interface ActivityTrendDatum {
  date: string;
  actions: number;
}

export interface ContentDistributionDatum {
  name: string;
  value: number;
  fill: string;
}

export function ActivityTrendChart({data}: { data: ActivityTrendDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid}/>
        <XAxis
          dataKey="date"
          stroke={chartColors.grid}
          tick={{fill: 'var(--text-muted)', fontSize: 12}}
        />
        <YAxis
          stroke={chartColors.grid}
          tick={{fill: 'var(--text-muted)', fontSize: 12}}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: chartColors.tooltip.bg,
            border: `1px solid ${chartColors.tooltip.border}`,
            borderRadius: '8px',
          }}
          labelStyle={{color: chartColors.tooltip.text}}
        />
        <Line
          type="monotone"
          dataKey="actions"
          stroke={chartColors.primary}
          strokeWidth={2}
          dot={{fill: chartColors.primary, r: 4}}
          activeDot={{r: 6}}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ContentDistributionChart({data}: { data: ContentDistributionDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({name, value}) => `${name}: ${value}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill}/>
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: chartColors.tooltip.bg,
            border: `1px solid ${chartColors.tooltip.border}`,
            borderRadius: '8px',
          }}
          labelStyle={{color: chartColors.tooltip.text}}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
