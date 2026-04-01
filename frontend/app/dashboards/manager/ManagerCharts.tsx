'use client';

import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts';

interface TrendDataPoint {
  name: string;
  rate: number;
}

interface PulseDataPoint {
  subject: string;
  A: number;
  fullMark: number;
}

interface ManagerAttendanceTrendChartProps {
  data: TrendDataPoint[];
}

export function ManagerAttendanceTrendChart({ data }: ManagerAttendanceTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.1} />
            <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" opacity={0.5} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-muted)', fontSize: 12, fontWeight: 700 }} />
        <YAxis hide domain={[0, 110]} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', backdropFilter: 'blur(10px)', borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
        />
        <Area type="monotone" dataKey="rate" stroke="var(--accent-primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorRate)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface ManagerPerformanceRadarChartProps {
  data: PulseDataPoint[];
}

export function ManagerPerformanceRadarChart({ data }: ManagerPerformanceRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke="var(--chart-muted)" opacity={0.5} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--chart-muted)', fontSize: 10, fontWeight: 800 }} />
        <PolarRadiusAxis hide />
        <Radar
          name="Team"
          dataKey="A"
          stroke="var(--chart-warning)"
          fill="var(--chart-warning)"
          fillOpacity={0.3}
          strokeWidth={3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
