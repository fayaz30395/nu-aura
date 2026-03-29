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
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
        />
        <Line
          type="monotone"
          dataKey="totalHours"
          name="Work Hours"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: 'var(--chart-info)', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
