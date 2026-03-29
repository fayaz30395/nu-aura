'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { chartColors } from '@/lib/utils/theme-colors';

// ── Retention Trend Sparkline ──────────────────────────────────────

interface TrendEntry {
  value: number;
}

export function RetentionSparkline({ data }: { data: TrendEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.success()} stopOpacity={0.2} />
            <stop offset="95%" stopColor={chartColors.success()} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={chartColors.success()} fill="url(#retentionGrad)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Engagement Sparkline ───────────────────────────────────────────

export function EngagementSparkline({ data }: { data: TrendEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <Bar dataKey="value" fill={chartColors.warning()} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Gender Pie Chart ───────────────────────────────────────────────

interface GenderPieEntry {
  name: string;
  value: number;
}

export function GenderPieChart({ data, colors }: { data: GenderPieEntry[]; colors: string[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Tenure Bar Chart ───────────────────────────────────────────────

interface TenureBarEntry {
  label: string;
  value: number;
}

export function TenureBarChart({ data }: { data: TenureBarEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
        <Bar dataKey="value" fill={chartColors.secondary()} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
