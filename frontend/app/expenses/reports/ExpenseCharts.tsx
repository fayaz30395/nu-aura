'use client';

/**
 * ExpenseCharts — recharts chart components for the Expense Reports page.
 *
 * This file is intentionally separate so that `next/dynamic` can code-split
 * the entire recharts bundle away from the initial page JS. It is only loaded
 * after the page shell renders (ssr: false).
 */

import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

// Using CSS custom properties for theme-aware colors that adapt to dark mode
const COLORS = [
  'var(--chart-primary)',
  'var(--chart-info)',
  'var(--chart-success)',
  'var(--chart-warning)',
  'var(--chart-danger)',
  'var(--chart-primary)',
  'var(--chart-accent)',
  'var(--chart-warning)',
  'var(--chart-success)',
  'var(--chart-info)',
];

interface ChartDataPoint {
  name?: string;
  month?: string;
  amount: number;
  count: number;
}

interface ExpenseTrendChartProps {
  data: ChartDataPoint[];
}

export function ExpenseTrendChart({ data }: ExpenseTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-surface-500)' }} />
        <YAxis tick={{ fontSize: 12, fill: 'var(--color-surface-500)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--color-surface-200)',
            borderRadius: '8px',
          }}
        />
        <Line type="monotone" dataKey="amount" stroke="var(--chart-primary)" strokeWidth={2} dot={{ r: 4 }} name="Amount" />
        <Line type="monotone" dataKey="count" stroke="var(--chart-success)" strokeWidth={2} dot={{ r: 4 }} name="Claims" />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface ExpenseCategoryChartProps {
  data: ChartDataPoint[];
}

export function ExpenseCategoryChart({ data }: ExpenseCategoryChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="amount"
          nameKey="name"
          // @ts-expect-error recharts Pie label typing is incomplete for custom render functions
          label={(props: Record<string, unknown>) => `${props.name} ${(Number(props.percent) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface ExpenseStatusChartProps {
  data: ChartDataPoint[];
}

export function ExpenseStatusChart({ data }: ExpenseStatusChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-surface-500)' }} />
        <YAxis tick={{ fontSize: 12, fill: 'var(--color-surface-500)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--color-surface-200)',
            borderRadius: '8px',
          }}
        />
        <Bar dataKey="amount" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} name="Amount" />
        <Bar dataKey="count" fill="var(--chart-success)" radius={[4, 4, 0, 0]} name="Claims" />
      </BarChart>
    </ResponsiveContainer>
  );
}
