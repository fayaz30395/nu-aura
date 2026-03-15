'use client';

import React, { useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addDays,
  startOfDay,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { CalendarEvent, getStatusColor, getPriorityColor } from '@/lib/types/project-calendar';

interface CalendarGridViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  viewMode: 'month' | 'week' | 'day';
}

export function CalendarGridView({
  currentDate,
  onDateChange,
  events,
  onEventClick,
  viewMode,
}: CalendarGridViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const getDayEvents = (day: Date) => {
    return events.filter((event) => {
      // Simple check for same day start - in real world might span multiple days
      const eventStart = startOfDay(new Date(event.startDate));
      return isSameDay(eventStart, day);
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-px bg-surface-200 dark:bg-surface-700 rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <div key={day} className="bg-surface-50 dark:bg-surface-800 p-2 text-center text-sm font-medium text-surface-600 dark:text-surface-400">
          {day}
        </div>
      ))}
      {calendarDays.map((day, idx) => {
        const dayEvents = getDayEvents(day);
        const isCurrentMonth = isSameMonth(day, monthStart);
        
        return (
          <div
            key={day.toISOString()}
            className={`min-h-[120px] p-2 bg-[var(--bg-card)] ${
              !isCurrentMonth ? 'bg-surface-50/50 dark:bg-surface-900/50 text-surface-400' : ''
            } ${isToday(day) ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
            onClick={() => onDateChange(day)}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday(day)
                    ? 'bg-primary-500 text-white'
                    : 'text-surface-700 dark:text-surface-300'
                }`}
              >
                {format(day, 'd')}
              </span>
              {dayEvents.length > 0 && (
                <span className="text-xs text-surface-500 font-medium">
                  {dayEvents.length} items
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {dayEvents.slice(0, 4).map((event) => (
                <button
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  className="w-full text-left px-2 py-1 rounded text-xs font-medium truncate transition-colors hover:opacity-80 flex items-center gap-1.5"
                  style={{
                    backgroundColor: event.color + '20',
                    color: event.color,
                    borderLeft: `3px solid ${event.color}`,
                  }}
                >
                  {event.type === 'milestone' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                  )}
                  <span className="truncate">{event.title}</span>
                </button>
              ))}
              {dayEvents.length > 4 && (
                <button 
                  className="w-full text-center text-xs text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateChange(day);
                  }}
                >
                  +{dayEvents.length - 4} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {viewMode === 'month' && renderMonthView()}
      {/* Implement Week/Day views later if needed, for now Month is priority */}
      {viewMode !== 'month' && (
        <div className="flex items-center justify-center h-64 bg-surface-50 dark:bg-surface-900/50 rounded-lg border border-dashed border-surface-300 dark:border-surface-700">
          <p className="text-surface-500">
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} view coming soon
          </p>
        </div>
      )}
    </div>
  );
}
