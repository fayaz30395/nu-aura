'use client';

import React from 'react';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {TrendData} from '@/lib/types/core/analytics';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';

interface AttendanceTrendChartProps {
  data: TrendData[];
  className?: string;
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({data, className = ''}) => {
  const hasData = data && data.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Attendance Trend (Last 7 Days)</CardTitle>
        <CardDescription>Daily attendance pattern</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700"/>
              <XAxis
                dataKey="date"
                className="text-caption"
                tick={{fill: 'currentColor'}}
              />
              <YAxis className="text-caption" tick={{fill: 'currentColor'}}/>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--chart-tooltip-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
                labelStyle={{color: 'var(--chart-tooltip-text)', fontWeight: 600}}
              />
              <Legend/>
              <Line
                type="monotone"
                dataKey="value"
                name="Present"
                stroke="var(--chart-success)"
                strokeWidth={2}
                dot={{fill: 'var(--chart-success)', r: 4}}
                activeDot={{r: 6}}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center text-[var(--text-muted)]">
              <p className="text-sm font-medium">No attendance data available</p>
              <p className="text-xs mt-1">Attendance records will appear here once logged</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
