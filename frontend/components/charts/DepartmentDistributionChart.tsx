'use client';

import React from 'react';
import {Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {DepartmentDistribution} from '@/lib/types/core/analytics';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';

interface DepartmentDistributionChartProps {
  data: DepartmentDistribution[];
  className?: string;
}

export const DepartmentDistributionChart: React.FC<DepartmentDistributionChartProps> = ({
                                                                                          data,
                                                                                          className = '',
                                                                                        }) => {
  const hasData = data && data.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Department Distribution</CardTitle>
        <CardDescription>Employees by department</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{top: 5, right: 30, left: 100, bottom: 5}}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700"/>
              <XAxis
                type="number"
                className="text-caption"
                tick={{fill: 'currentColor'}}
              />
              <YAxis
                type="category"
                dataKey="department"
                className="text-caption"
                tick={{fill: 'currentColor'}}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--chart-tooltip-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              />
              <Legend/>
              <Bar dataKey="count" name="Employees" fill="var(--chart-success)" radius={[0, 8, 8, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center text-[var(--text-muted)]">
              <p className="text-sm font-medium">No department data available</p>
              <p className="text-xs mt-1">Department distribution will appear here once employees are assigned</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
