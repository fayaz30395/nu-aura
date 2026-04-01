'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface GrowthDataEntry {
  month: string;
  tenants: number;
  activeUsers: number;
  employees: number;
}

interface GrowthChartProps {
  data: GrowthDataEntry[];
}

export default function GrowthChart({ data }: GrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis
          dataKey="month"
          stroke="var(--chart-muted)"
          style={{ fontSize: '12px' }}
        />
        <YAxis stroke="var(--chart-muted)" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--chart-tooltip-border)',
            borderRadius: '6px',
          }}
          labelStyle={{ color: 'var(--chart-tooltip-text)' }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="tenants"
          stroke="var(--chart-primary)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="activeUsers"
          stroke="var(--chart-success)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="employees"
          stroke="var(--chart-secondary)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
