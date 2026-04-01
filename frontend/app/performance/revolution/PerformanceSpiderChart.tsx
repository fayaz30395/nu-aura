'use client';

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface SpiderMetric {
  subject: string;
  self: number;
  peer: number;
  manager: number;
}

interface PerformanceSpiderChartProps {
  metrics: SpiderMetric[];
}

export default function PerformanceSpiderChart({ metrics }: PerformanceSpiderChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={metrics}>
        <PolarGrid stroke="var(--chart-grid)" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip />
        <Radar
          name="Self"
          dataKey="self"
          stroke="var(--chart-success)"
          fill="var(--chart-success)"
          fillOpacity={0.2}
        />
        <Radar
          name="Peers"
          dataKey="peer"
          stroke="var(--chart-secondary)"
          fill="var(--chart-secondary)"
          fillOpacity={0.2}
        />
        <Radar
          name="Manager"
          dataKey="manager"
          stroke="var(--chart-primary)"
          fill="var(--chart-primary)"
          fillOpacity={0.4}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
