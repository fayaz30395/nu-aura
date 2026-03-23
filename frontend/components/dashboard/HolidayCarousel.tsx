'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { UpcomingHolidayResponse } from '@/lib/services/home.service';
import { useUpcomingHolidays } from '@/lib/hooks/queries/useHome';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  description?: string;
  isOptional: boolean;
  daysUntil: number;
  dayOfWeek: string;
}

interface HolidayCarouselProps {
  holidays?: Holiday[];
  isLoading?: boolean;
}

function mapApiHoliday(h: UpcomingHolidayResponse): Holiday {
  return {
    id: h.id,
    name: h.name,
    date: h.date,
    type: h.type,
    description: h.description,
    isOptional: h.isOptional,
    daysUntil: h.daysUntil,
    dayOfWeek: h.dayOfWeek,
  };
}

export function HolidayCarousel({
  holidays: propHolidays,
  isLoading: propLoading = false,
}: HolidayCarouselProps) {
  const { data: apiData, isLoading: queryLoading } = useUpcomingHolidays(90, !propHolidays);

  const holidays = propHolidays ?? (apiData ? apiData.map(mapApiHoliday) : []);
  const isLoading = propLoading || queryLoading;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const displayedHolidays = holidays;

  // Reset index when holiday list changes (e.g. after API fetch)
  useEffect(() => {
    setCurrentIndex(0);
  }, [displayedHolidays.length]);

  useEffect(() => {
    if (displayedHolidays.length <= 1 || isHovering) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayedHolidays.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovering, displayedHolidays.length]);

  if (isLoading) {
    return (
      <div className="skeuo-card rounded-2xl border border-[var(--border-main)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="skeuo-emboss text-sm font-semibold text-[var(--text-primary)]">Upcoming Holidays</h3>
        </div>
        <div className="rounded-lg bg-[var(--bg-surface)] p-4 animate-pulse">
          <div className="flex items-start gap-2">
            <div className="w-12 h-12 rounded-lg bg-[var(--bg-surface)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[var(--bg-surface)] rounded w-3/4" />
              <div className="h-3 bg-[var(--bg-surface)] rounded w-1/2" />
              <div className="h-3 bg-[var(--bg-surface)] rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (displayedHolidays.length === 0) {
    return (
      <div className="skeuo-card rounded-2xl border border-[var(--border-main)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="skeuo-emboss text-sm font-semibold text-[var(--text-primary)]">Upcoming Holidays</h3>
        </div>
        <div className="text-center py-4">
          <CalendarDays className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-1" />
          <p className="text-xs text-[var(--text-muted)]">No upcoming holidays</p>
        </div>
      </div>
    );
  }

  const currentHoliday = displayedHolidays[currentIndex];

  return (
    <div
      className="skeuo-card rounded-2xl border border-[var(--border-main)] p-5"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="skeuo-emboss text-sm font-semibold text-[var(--text-primary)]">
          Upcoming Holidays
        </h3>
        <a
          href="/holidays"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          View All
        </a>
      </div>

      {/* Holiday Card — clean flat style */}
      <div className="rounded-lg bg-[var(--bg-surface)] p-4">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-white border border-[var(--border-main)] dark:bg-[var(--bg-surface)] dark:border-[var(--border-main)]">
            <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {currentHoliday.name}
            </h4>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {currentHoliday.dayOfWeek},{' '}
              {new Date(currentHoliday.date + 'T00:00:00').toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-[var(--text-muted)]">
                {currentHoliday.daysUntil > 0 ? `In ${currentHoliday.daysUntil} days` : 'Today'}
              </span>
              <span className="inline-block rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-xs font-medium text-[var(--text-secondary)] uppercase ">
                {currentHoliday.type.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {displayedHolidays.length > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + displayedHolidays.length) % displayedHolidays.length)}
            className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]  transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {displayedHolidays.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-4 bg-[var(--text-muted)]' : 'w-1.5 bg-[var(--border-main)]'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % displayedHolidays.length)}
            className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]  transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
