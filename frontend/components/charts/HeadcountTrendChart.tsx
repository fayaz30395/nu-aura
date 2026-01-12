'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendData } from '@/lib/types/analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface HeadcountTrendChartProps {
  data: TrendData[];
  className?: string;
}

export const HeadcountTrendChart: React.FC<HeadcountTrendChartProps> = ({ data, className = '' }) => {
  const hasData = data && data.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Headcount Trend (Last 6 Months)</CardTitle>
        <CardDescription>Employee count over time</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="date"
                className="text-xs text-slate-600 dark:text-slate-400"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis className="text-xs text-slate-600 dark:text-slate-400" tick={{ fill: 'currentColor' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
                labelStyle={{ color: '#0f172a', fontWeight: 600 }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="value"
                name="Headcount"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorHeadcount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center text-slate-400 dark:text-slate-500">
              <p className="text-sm font-medium">No headcount data available</p>
              <p className="text-xs mt-1">Employee count history will appear here</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
