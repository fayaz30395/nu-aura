'use client';

import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

// ── Headcount Trend Chart ─────────────────────────────────────────

interface HeadcountTrendEntry {
  period: string;
  value: number;
}

interface ExecutiveHeadcountChartProps {
  data: HeadcountTrendEntry[];
}

export function ExecutiveHeadcountChart({ data }: ExecutiveHeadcountChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey="period" tick={{ fill: 'var(--chart-muted)', fontSize: 12 }} />
        <YAxis tick={{ fill: 'var(--chart-muted)', fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--accent-primary)"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorHeadcount)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Department Distribution Pie Chart ─────────────────────────────

interface DepartmentEntry {
  category: string;
  count: number;
}

interface ExecutiveDeptPieChartProps {
  data: DepartmentEntry[];
  colors: string[];
  formatNumber: (value: number) => string;
}

export function ExecutiveDeptPieChart({ data, colors, formatNumber }: ExecutiveDeptPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
          labelLine={true}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatNumber(value as number)} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
