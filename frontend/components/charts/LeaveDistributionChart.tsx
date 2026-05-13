'use client';

import React from 'react';
import {Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip} from 'recharts';
import {PieChart as PieChartIcon} from 'lucide-react';
import {LeaveTypeDistribution} from '@/lib/types/core/analytics';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {EmptyState} from '@/components/ui/EmptyState';

interface LeaveDistributionChartProps {
  data: LeaveTypeDistribution[];
  className?: string;
}

export const LeaveDistributionChart: React.FC<LeaveDistributionChartProps> = ({data, className = ''}) => {
  const hasData = data && data.length > 0;
  const chartData = hasData
    ? data.map((item) => ({
      name: item.leaveType,
      value: item.count,
      color: item.color,
    }))
    : [];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Leave Type Distribution</CardTitle>
        <CardDescription>Leave requests by type</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="var(--chart-secondary)"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color}/>
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--chart-tooltip-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              />
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <EmptyState
              icon={<PieChartIcon className="h-8 w-8"/>}
              title="No leave data available"
              description="Leave requests will appear here once submitted."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
