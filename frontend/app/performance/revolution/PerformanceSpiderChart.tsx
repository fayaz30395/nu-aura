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
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip />
        <Radar
          name="Self"
          dataKey="self"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.2}
        />
        <Radar
          name="Peers"
          dataKey="peer"
          stroke="#8b5cf6"
          fill="#8b5cf6"
          fillOpacity={0.2}
        />
        <Radar
          name="Manager"
          dataKey="manager"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.4}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
