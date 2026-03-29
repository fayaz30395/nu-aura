'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { chartColors } from '@/lib/utils/theme-colors';
import { formatCurrency } from '@/lib/utils';

// ── Shared Tooltip ─────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: string;
  value: number | string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-input)] p-4 rounded-lg shadow-lg border border-[var(--border-main)]">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ── Attendance Trend ───────────────────────────────────────────────

interface AttendanceTrendEntry {
  label: string;
  value: number;
}

export function AnalyticsAttendanceTrendChart({ data }: { data: AttendanceTrendEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.info()} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColors.info()} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
        <YAxis tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          name="Attendance"
          stroke={chartColors.info()}
          fill="url(#attendanceGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Attendance Pie ─────────────────────────────────────────────────

interface PieEntry {
  name: string;
  value: number;
  color: string;
}

export function AnalyticsAttendancePieChart({ data }: { data: PieEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span className="text-sm text-[var(--text-secondary)]">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Department Bar Chart ───────────────────────────────────────────

interface DepartmentEntry {
  department: string;
  count: number;
}

export function AnalyticsDeptBarChart({ data }: { data: DepartmentEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
        <XAxis type="number" tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
        <YAxis
          type="category"
          dataKey="department"
          tick={{ fontSize: 12 }}
          stroke={chartColors.muted()}
          width={100}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="Employees" fill={chartColors.secondary()} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Leave Pie Chart ────────────────────────────────────────────────

interface LeaveEntry {
  leaveType: string;
  count: number;
  color?: string;
}

export function AnalyticsLeavePieChart({ data, colors }: { data: LeaveEntry[]; colors: string[] }) {
  const pieData = data.map(d => ({
    name: d.leaveType,
    value: d.count,
    color: d.color || colors[0],
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span className="text-sm text-[var(--text-secondary)]">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Payroll Trend ──────────────────────────────────────────────────

interface PayrollTrendEntry {
  month: string;
  amount: number;
}

export function AnalyticsPayrollChart({ data }: { data: PayrollTrendEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke={chartColors.muted()}
          tickFormatter={(value) =>
            new Intl.NumberFormat('en-IN', {
              notation: 'compact',
              compactDisplay: 'short',
            }).format(value)
          }
        />
        <Tooltip
          formatter={(value) => [formatCurrency(value as number), 'Payroll']}
          labelFormatter={(label) => `Month: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="amount"
          name="Payroll"
          stroke={chartColors.info()}
          strokeWidth={3}
          dot={{ fill: chartColors.info(), strokeWidth: 2 }}
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Headcount Trend ────────────────────────────────────────────────

interface HeadcountTrendEntry {
  label: string;
  value: number;
}

export function AnalyticsHeadcountChart({ data }: { data: HeadcountTrendEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="headcountGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.success()} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColors.success()} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
        <YAxis tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          name="Headcount"
          stroke={chartColors.success()}
          fill="url(#headcountGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
