'use client';

import React, {memo} from 'react';
import {BarChart3, Calendar, Moon, Sun} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {STANDARD_WORK_HOURS} from './utils';

// ─── Chart Data Shape ─────────────────────────────────────────────────────────
export interface ChartEntry {
  name: string;
  date: string;
  hours: number;
  isToday: boolean;
  isHoliday: boolean;
  isWeeklyOff: boolean;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  overtime: number;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({active, payload}: { active?: boolean; payload?: Array<{ payload: ChartEntry }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-[var(--shadow-dropdown)] p-4 min-w-[180px]">
      <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">
        {d.name} · {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
      </div>
      {d.isHoliday ? (
        <div className='flex items-center gap-1.5 text-xs text-accent'><Sun className="h-3 w-3"/> Holiday</div>
      ) : d.isWeeklyOff ? (
        <div className="flex items-center gap-1.5 text-caption"><Moon className="h-3 w-3"/> Weekly Off</div>
      ) : d.hours > 0 ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Hours</span>
            <span className="font-bold text-[var(--text-primary)]">{d.hours}h</span>
          </div>
          {d.checkIn && (
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Check In</span>
              <span className="font-medium text-[var(--text-primary)]">{d.checkIn}</span>
            </div>
          )}
          {d.checkOut && (
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Check Out</span>
              <span className="font-medium text-[var(--text-primary)]">{d.checkOut}</span>
            </div>
          )}
          {d.overtime > 0 && (
            <div className="flex justify-between text-xs">
              <span className='text-status-warning-text'>Overtime</span>
              <span className='font-bold text-status-warning-text'>+{d.overtime}h</span>
            </div>
          )}
          <div className="pt-1 border-t border-[var(--border-subtle)]">
            <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${
              d.hours >= STANDARD_WORK_HOURS ? "bg-status-success-bg text-status-success-text" :
                d.hours >= STANDARD_WORK_HOURS / 2 ? "bg-status-warning-bg text-status-warning-text" :
                  "bg-status-danger-bg text-status-danger-text"
            }`}>
              {d.hours >= STANDARD_WORK_HOURS ? 'Full Day' : d.hours >= STANDARD_WORK_HOURS / 2 ? 'Half Day' : 'Short Day'}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-caption">No attendance</div>
      )}
    </div>
  );
}

// ─── Chart Component ──────────────────────────────────────────────────────────
interface AttendanceWeeklyChartProps {
  chartData: ChartEntry[];
  attendanceRate: number;
}

/**
 * Weekly bar chart showing last 7 days attendance.
 * Memoized — only re-renders when chart data changes.
 */
export const AttendanceWeeklyChart = memo(function AttendanceWeeklyChart({
                                                                           chartData,
                                                                           attendanceRate,
                                                                         }: AttendanceWeeklyChartProps) {
  return (
    <Card
      className="lg:col-span-2 skeuo-card card-aura border border-[var(--border-main)] shadow-[var(--shadow-elevated)]">
      <CardHeader className="border-b border-[var(--border-main)] pb-4">
        <div className="row-between">
          <CardTitle className="flex items-center gap-2 text-card-title text-[var(--text-primary)]">
            <div
              className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-[var(--shadow-card)]">
              <BarChart3 className='h-4 w-4 text-inverse'/>
            </div>
            Weekly Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5"/> Last 7 days
            </span>
            {attendanceRate > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                attendanceRate >= 95 ? "bg-status-success-bg text-status-success-text" :
                  attendanceRate >= 80 ? "bg-status-warning-bg text-status-warning-text" :
                    "bg-status-danger-bg text-status-danger-text"
              }`}>
                {attendanceRate}% this month
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{top: 8, right: 8, left: -20, bottom: 0}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)"/>
            <XAxis dataKey="name" axisLine={false} tickLine={false}
                   tick={{fill: 'var(--chart-muted)', fontSize: 11, fontWeight: 500}} dy={8}/>
            <YAxis axisLine={false} tickLine={false}
                   tick={{fill: 'var(--chart-muted)', fontSize: 11}}
                   domain={[0, 'auto']}/>
            <RechartsTooltip content={<CustomTooltip/>} cursor={{fill: 'var(--chart-grid)', opacity: 0.3}}/>
            <ReferenceLine y={STANDARD_WORK_HOURS} stroke="var(--chart-primary)" strokeDasharray="6 4" strokeWidth={1.5}
                           strokeOpacity={0.5}/>
            <Bar dataKey="hours" radius={[8, 8, 0, 0]} maxBarSize={48}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.isHoliday ? 'var(--chart-accent, var(--accent-primary))'
                      : entry.hours >= STANDARD_WORK_HOURS ? 'var(--chart-success)'
                        : entry.isToday ? 'var(--chart-primary)'
                          : entry.hours > 0 ? 'var(--chart-warning)'
                            : 'var(--chart-grid)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2 text-xs">
          {[
            {color: "bg-status-success-bg", label: `Full Day (${STANDARD_WORK_HOURS}h+)`},
            {color: "bg-accent", label: 'Today'},
            {color: "bg-status-warning-bg", label: 'Partial'},
            {color: "bg-accent", label: 'Holiday'},
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded-md ${l.color} shadow-[var(--shadow-card)]`}/>
              <span className="font-medium text-[var(--text-secondary)]">{l.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
