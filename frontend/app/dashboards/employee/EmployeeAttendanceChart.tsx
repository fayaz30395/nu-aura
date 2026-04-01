'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface WeeklyTrendEntry {
  date: string;
  totalHours: number;
}

interface EmployeeAttendanceChartProps {
  weeklyTrend: WeeklyTrendEntry[];
}

export default function EmployeeAttendanceChart({ weeklyTrend }: EmployeeAttendanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={weeklyTrend}>
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-surface-200 dark:stroke-surface-700"
        />
        <XAxis
          dataKey="date"
          className="text-xs text-[var(--text-secondary)]"
          tick={{ fill: 'currentColor' }}
        />
        <YAxis
          className="text-xs text-[var(--text-secondary)]"
          tick={{ fill: 'currentColor' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--chart-tooltip-border)',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
        />
        <Line
          type="monotone"
          dataKey="totalHours"
          name="Work Hours"
          stroke="var(--chart-primary)"
          strokeWidth={2}
          dot={{ fill: 'var(--chart-info)', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
