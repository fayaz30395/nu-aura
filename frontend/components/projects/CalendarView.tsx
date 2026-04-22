'use client';

import {useMemo, useState} from 'react';
import {ChevronLeft, ChevronRight,} from 'lucide-react';
import {CALENDAR_EVENT_COLORS, CalendarEvent, CalendarViewType,} from '@/lib/types/hrms/project-calendar';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getHours,
  getMinutes,
  isSameMonth,
  isToday,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  className?: string;
}

const HOURS = Array.from({length: 24}, (_, i) => i);
const HOUR_HEIGHT = 60; // pixels per hour

export function CalendarView({
                               events,
                               onEventClick,
                               onDateClick,
                               className = '',
                             }: CalendarViewProps) {
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Navigation handlers
  const handlePrevious = () => {
    switch (viewType) {
      case 'day':
        setCurrentDate(subDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewType) {
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Get title based on view type
  const getTitle = () => {
    switch (viewType) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate, {weekStartsOn: 1});
        const weekEnd = endOfWeek(currentDate, {weekStartsOn: 1});
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return format(weekStart, 'MMMM d') + ' - ' + format(weekEnd, 'd, yyyy');
        }
        return format(weekStart, 'MMM d') + ' - ' + format(weekEnd, 'MMM d, yyyy');
      case 'month':
        return format(currentDate, 'MMMM yyyy');
    }
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      return (
        isWithinInterval(event.startDate, {start: dayStart, end: dayEnd}) ||
        isWithinInterval(event.endDate, {start: dayStart, end: dayEnd}) ||
        (event.startDate <= dayStart && event.endDate >= dayEnd)
      );
    });
  };

  // Month view calendar days
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), {weekStartsOn: 1});
    const end = endOfWeek(endOfMonth(currentDate), {weekStartsOn: 1});
    return eachDayOfInterval({start, end});
  }, [currentDate]);

  // Week view days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, {weekStartsOn: 1});
    const end = endOfWeek(currentDate, {weekStartsOn: 1});
    return eachDayOfInterval({start, end});
  }, [currentDate]);

  // Render event badge
  const renderEventBadge = (event: CalendarEvent, compact = false) => {
    const backgroundColor = event.color || CALENDAR_EVENT_COLORS[event.type] || '#3b82f6';

    return (
      <div
        key={event.id}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick?.(event);
        }}
        className={`cursor-pointer rounded px-1.5 py-0.5 text-xs text-inverse truncate hover:opacity-80 transition-opacity ${
          compact ? 'mb-0.5' : 'mb-1'
        }`}
        style={{backgroundColor}}
        title={`${event.title} - ${format(event.startDate, 'HH:mm')} to ${format(event.endDate, 'HH:mm')}`}
      >
        {!event.allDay && !compact && (
          <span className="mr-1 opacity-80">{format(event.startDate, 'HH:mm')}</span>
        )}
        {event.title}
      </div>
    );
  };

  // Month View
  const renderMonthView = () => (
    <div className='grid grid-cols-7 border-t border-l border-subtle'>
      {/* Header */}
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
        <div
          key={day}
          className='py-2 text-center text-sm font-medium text-secondary border-r border-b border-subtle bg-base'
        >
          {day}
        </div>
      ))}

      {/* Days */}
      {monthDays.map((day) => {
        const dayEvents = getEventsForDate(day);
        const isCurrentMonth = isSameMonth(day, currentDate);
        const isSelected = isToday(day);

        return (
          <div
            key={day.toISOString()}
            onClick={() => {
              onDateClick?.(day);
              setCurrentDate(day);
              setViewType('day');
            }}
            className={`min-h-[100px] p-1 border-r border-b border-subtle cursor-pointer transition-colors ${
              isCurrentMonth
                ? 'bg-[var(--bg-card)]'
                : "bg-base"
            } hover:bg-surface`}
          >
            <div
              className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                isSelected
                  ? "bg-accent text-inverse"
                  : isCurrentMonth
                    ? "text-primary"
                    : "text-muted"
              }`}
            >
              {format(day, 'd')}
            </div>
            <div className="space-y-0.5">
              {dayEvents.slice(0, 3).map((event) => renderEventBadge(event, true))}
              {dayEvents.length > 3 && (
                <div className='text-xs text-muted px-1.5'>
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Week View
  const renderWeekView = () => (
    <div className="flex flex-col">
      {/* Header */}
      <div className='flex border-b border-subtle'>
        <div className='w-16 border-r border-subtle'/>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            onClick={() => {
              onDateClick?.(day);
              setCurrentDate(day);
              setViewType('day');
            }}
            className='flex-1 py-2 text-center border-r border-subtle cursor-pointer hover:bg-base'
          >
            <div className='text-xs text-muted uppercase'>{format(day, 'EEE')}</div>
            <div
              className={`text-lg font-medium mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${
                isToday(day)
                  ? "bg-accent text-inverse"
                  : "text-primary"
              }`}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events */}
      <div className='flex border-b border-subtle min-h-[40px]'>
        <div className='w-16 p-1 text-xs text-muted border-r border-subtle'>
          All-day
        </div>
        {weekDays.map((day) => {
          const allDayEvents = getEventsForDate(day).filter((e) => e.allDay);
          return (
            <div
              key={day.toISOString()}
              className='flex-1 p-1 border-r border-subtle'
            >
              {allDayEvents.map((event) => renderEventBadge(event, true))}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex overflow-y-auto" style={{height: 'calc(100vh - 400px)'}}>
        {/* Time column */}
        <div className='w-16 flex-shrink-0 border-r border-subtle'>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className='h-[60px] px-2 text-xs text-muted text-right border-b border-subtle'
            >
              {format(new Date().setHours(hour, 0), 'HH:mm')}
            </div>
          ))}
        </div>

        {/* Days columns */}
        {weekDays.map((day) => {
          const dayEvents = getEventsForDate(day).filter((e) => !e.allDay);

          return (
            <div
              key={day.toISOString()}
              className='flex-1 relative border-r border-subtle'
            >
              {/* Hour lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className='h-[60px] border-b border-subtle'
                />
              ))}
              {/* Events */}
              {dayEvents.map((event) => {
                const startHour = getHours(event.startDate) + getMinutes(event.startDate) / 60;
                const endHour = getHours(event.endDate) + getMinutes(event.endDate) / 60;
                const duration = endHour - startHour;

                return (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className='absolute left-1 right-1 rounded px-1 py-0.5 text-xs text-inverse cursor-pointer hover:opacity-80 overflow-hidden'
                    style={{
                      top: `${startHour * HOUR_HEIGHT}px`,
                      height: `${Math.max(duration * HOUR_HEIGHT - 2, 20)}px`,
                      backgroundColor: event.color || CALENDAR_EVENT_COLORS[event.type],
                    }}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="opacity-80 truncate">
                      {format(event.startDate, 'HH:mm')} - {format(event.endDate, 'HH:mm')}
                    </div>
                  </div>
                );
              })}
              {/* Current time indicator */}
              {isToday(day) && (
                <div
                  className='absolute left-0 right-0 h-0.5 bg-status-danger-bg z-10 pointer-events-none'
                  style={{
                    top: `${(getHours(new Date()) + getMinutes(new Date()) / 60) * HOUR_HEIGHT}px`,
                  }}
                >
                  <div className='absolute -left-1 -top-1 w-2 h-2 bg-status-danger-bg rounded-full'/>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Day View
  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate).filter((e) => !e.allDay);
    const allDayEvents = getEventsForDate(currentDate).filter((e) => e.allDay);

    return (
      <div className="flex flex-col">
        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className='flex border-b border-subtle min-h-[40px]'>
            <div className='w-16 p-2 text-xs text-muted border-r border-subtle'>
              All-day
            </div>
            <div className="flex-1 p-2 space-y-1">
              {allDayEvents.map((event) => renderEventBadge(event))}
            </div>
          </div>
        )}
        {/* Time grid */}
        <div className="flex overflow-y-auto" style={{height: 'calc(100vh - 400px)'}}>
          {/* Time column */}
          <div className='w-16 flex-shrink-0 border-r border-subtle'>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className='h-[60px] px-2 text-xs text-muted text-right border-b border-subtle'
              >
                {format(new Date().setHours(hour, 0), 'HH:mm')}
              </div>
            ))}
          </div>

          {/* Events column */}
          <div className="flex-1 relative">
            {/* Hour lines */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className='h-[60px] border-b border-subtle'
              />
            ))}

            {/* Events */}
            {dayEvents.map((event) => {
              const startHour = getHours(event.startDate) + getMinutes(event.startDate) / 60;
              const endHour = getHours(event.endDate) + getMinutes(event.endDate) / 60;
              const duration = endHour - startHour;

              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                  className='absolute left-2 right-2 rounded p-2 text-inverse cursor-pointer hover:opacity-80 overflow-hidden'
                  style={{
                    top: `${startHour * HOUR_HEIGHT}px`,
                    height: `${Math.max(duration * HOUR_HEIGHT - 4, 30)}px`,
                    backgroundColor: event.color || CALENDAR_EVENT_COLORS[event.type],
                  }}
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm opacity-80">
                    {format(event.startDate, 'HH:mm')} - {format(event.endDate, 'HH:mm')}
                  </div>
                  {event.description && duration > 1 && (
                    <div className="text-xs opacity-70 mt-1 line-clamp-2">{event.description}</div>
                  )}
                </div>
              );
            })}

            {/* Current time indicator */}
            {isToday(currentDate) && (
              <div
                className='absolute left-0 right-0 h-0.5 bg-status-danger-bg z-10 pointer-events-none'
                style={{
                  top: `${(getHours(new Date()) + getMinutes(new Date()) / 60) * HOUR_HEIGHT}px`,
                }}
              >
                <div className='absolute -left-1 -top-1 w-2 h-2 bg-status-danger-bg rounded-full'/>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-subtle ${className}`}>
      {/* Header */}
      <div
        className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-subtle'>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevious}
            className='p-2 rounded-lg hover:bg-surface transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
          >
            <ChevronLeft className='w-5 h-5 text-secondary'/>
          </button>
          <button
            onClick={handleNext}
            className='p-2 rounded-lg hover:bg-surface transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
          >
            <ChevronRight className='w-5 h-5 text-secondary'/>
          </button>
          <h2 className='text-xl font-semibold text-primary'>
            {getTitle()}
          </h2>
          <button
            onClick={handleToday}
            className='px-4 py-1.5 text-sm border border-subtle rounded-lg hover:bg-surface transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
          >
            Today
          </button>
        </div>

        {/* View Type Switcher */}
        <div className='flex items-center gap-1 p-1 bg-surface rounded-lg'>
          {(['day', 'week', 'month'] as CalendarViewType[]).map((type) => (
            <button
              key={type}
              onClick={() => setViewType(type)}
              className={`px-4 py-1.5 text-sm rounded-md capitalize transition-colors ${
                viewType === type
                  ? "bg-[var(--bg-surface)] text-accent shadow-[var(--shadow-card)]"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      {/* Calendar Content */}
      <div className="overflow-hidden">
        {viewType === 'month' && renderMonthView()}
        {viewType === 'week' && renderWeekView()}
        {viewType === 'day' && renderDayView()}
      </div>
      {/* Legend */}
      <div className='flex flex-wrap gap-4 p-4 border-t border-subtle text-sm'>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{backgroundColor: CALENDAR_EVENT_COLORS.project}}/>
          <span className='text-secondary'>Project</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{backgroundColor: CALENDAR_EVENT_COLORS.task}}/>
          <span className='text-secondary'>Task</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{backgroundColor: CALENDAR_EVENT_COLORS.milestone}}/>
          <span className='text-secondary'>Milestone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{backgroundColor: CALENDAR_EVENT_COLORS.deadline}}/>
          <span className='text-secondary'>Deadline</span>
        </div>
      </div>
    </div>
  );
}
