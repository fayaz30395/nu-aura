'use client';

import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {UpcomingHolidayResponse} from '@/lib/services/core/home.service';
import {useUpcomingHolidays} from '@/lib/hooks/queries/useHome';
import {formatDate} from '@/lib/utils/format/date';

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

/** Decorative holiday illustration — silhouette style */
function HolidayIllustration() {
  return (
    <div className="absolute right-4 bottom-2 opacity-20 pointer-events-none">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="30" fill="currentColor" opacity="0.3"/>
        <path d="M25 55 L40 20 L55 55 Z" fill="currentColor" opacity="0.4"/>
        <circle cx="30" cy="30" r="5" fill="currentColor" opacity="0.2"/>
        <circle cx="55" cy="25" r="3" fill="currentColor" opacity="0.2"/>
      </svg>
    </div>
  );
}

export function HolidayCarousel({
                                  holidays: propHolidays,
                                  isLoading: propLoading = false,
                                }: HolidayCarouselProps) {
  const {data: apiData, isLoading: queryLoading} = useUpcomingHolidays(90, !propHolidays);

  const holidays = propHolidays ?? (Array.isArray(apiData) ? apiData.map(mapApiHoliday) : []);
  const isLoading = propLoading || queryLoading;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const displayedHolidays = holidays;

  // Reset index when holiday list changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [displayedHolidays.length]);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (displayedHolidays.length <= 1 || isHovering) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayedHolidays.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovering, displayedHolidays.length]);

  if (isLoading) {
    return (
      <div
        className="relative overflow-hidden rounded-lg bg-accent-50 dark:bg-accent-900/30 p-4 text-accent-900 dark:text-accent-100">
        <div className="row-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Holidays</span>
          <span className="text-xs opacity-60">View All</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-7 w-40 rounded bg-accent-200/60 dark:bg-accent-700/40"/>
          <div className="h-4 w-32 rounded bg-accent-200/40 dark:bg-accent-700/30"/>
          <div className="h-5 w-24 rounded bg-accent-200/40 dark:bg-accent-700/30"/>
        </div>
      </div>
    );
  }

  if (displayedHolidays.length === 0) {
    return (
      <div
        className="relative overflow-hidden rounded-lg bg-accent-50 dark:bg-accent-900/30 p-4 text-accent-900 dark:text-accent-100">
        <div className="row-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Holidays</span>
          <a href="/holidays" className="text-xs opacity-60 hover:opacity-100 transition-opacity">View All</a>
        </div>
        <p className="text-sm opacity-70">No upcoming holidays</p>
      </div>
    );
  }

  const currentHoliday = displayedHolidays[currentIndex];
  const formattedDate = formatDate(currentHoliday.date + 'T00:00:00');

  const typeLabel = currentHoliday.type.replace(/_/g, ' ');

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-accent-50 dark:bg-accent-900/30 p-4 text-accent-900 dark:text-accent-100"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <HolidayIllustration/>

      {/* Header */}
      <div className="row-between mb-2 relative z-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-700 dark:text-accent-300">
          Holidays
        </span>
        <a
          href="/holidays"
          className="text-xs text-accent-700 dark:text-accent-300 hover:text-accent-900 dark:hover:text-accent-100 transition-colors font-medium"
        >
          View All
        </a>
      </div>

      {/* Holiday Content */}
      <div className="relative z-10 flex items-center">
        {/* Left Arrow */}
        {displayedHolidays.length > 1 && (
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + displayedHolidays.length) % displayedHolidays.length)}
            className="flex-shrink-0 -ml-1 mr-2 rounded-full p-1 text-accent-600/70 dark:text-accent-300/70 hover:text-accent-900 dark:hover:text-accent-100 hover:bg-accent-100 dark:hover:bg-accent-800/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            aria-label="Previous holiday"
          >
            <ChevronLeft className="h-5 w-5"/>
          </button>
        )}

        {/* Holiday Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold leading-tight truncate">
            {currentHoliday.name}
          </h3>
          <p className="text-sm text-accent-700 dark:text-accent-300 mt-1">
            {formattedDate}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="inline-flex items-center rounded-md bg-accent-100 dark:bg-accent-800/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent-800 dark:text-accent-200">
              {typeLabel}
            </span>
            {currentHoliday.daysUntil > 0 && (
              <span className="text-xs text-accent-700 dark:text-accent-300">
                in {currentHoliday.daysUntil} {currentHoliday.daysUntil === 1 ? 'day' : 'days'}
              </span>
            )}
            {currentHoliday.daysUntil === 0 && (
              <span className="text-xs font-semibold text-accent-900 dark:text-accent-100">Today!</span>
            )}
          </div>
        </div>

        {/* Right Arrow */}
        {displayedHolidays.length > 1 && (
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % displayedHolidays.length)}
            className="flex-shrink-0 -mr-1 ml-2 rounded-full p-1 text-accent-600/70 dark:text-accent-300/70 hover:text-accent-900 dark:hover:text-accent-100 hover:bg-accent-100 dark:hover:bg-accent-800/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            aria-label="Next holiday"
          >
            <ChevronRight className="h-5 w-5"/>
          </button>
        )}
      </div>

      {/* Dot Indicators */}
      {displayedHolidays.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2 relative z-10">
          {displayedHolidays.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ${
                idx === currentIndex ? 'w-4 bg-accent-600 dark:bg-accent-300' : 'w-1.5 bg-accent-300/60 dark:bg-accent-700/60'
              }`}
              aria-label={`Holiday ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
