'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PayrollTrendData } from '@/lib/types/analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface PayrollCostTrendChartProps {
  data: PayrollTrendData[];
  className?: string;
}

export const PayrollCostTrendChart: React.FC<PayrollCostTrendChartProps> = ({ data, className = '' }) => {
  const hasData = data && data.length > 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Payroll Cost Trend (Last 6 Months)</CardTitle>
        <CardDescription>Monthly payroll expenses</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="month"
                className="text-xs text-slate-600 dark:text-slate-400"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                className="text-xs text-slate-600 dark:text-slate-400"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Total Cost']}
              />
              <Legend />
              <Bar dataKey="amount" name="Payroll Cost" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center text-slate-400 dark:text-slate-500">
              <p className="text-sm font-medium">No payroll data available</p>
              <p className="text-xs mt-1">Payroll history will appear here once processed</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
