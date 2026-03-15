'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { homeService, UpcomingHolidayResponse } from '@/lib/services/home.service';

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

const DEMO_HOLIDAYS: Holiday[] = [
  {
    id: '1',
    name: 'Good Friday',
    date: '2026-04-03',
    type: 'FLOATER_LEAVE',
    description: 'Christian holiday',
    isOptional: false,
    daysUntil: 21,
    dayOfWeek: 'Friday',
  },
  {
    id: '2',
    name: 'Eid al-Fitr',
    date: '2026-03-30',
    type: 'RELIGIOUS_HOLIDAY',
    description: 'Islamic holiday',
    isOptional: false,
    daysUntil: 17,
    dayOfWeek: 'Monday',
  },
  {
    id: '3',
    name: 'May Day',
    date: '2026-05-01',
    type: 'PUBLIC_HOLIDAY',
    description: 'Labour Day',
    isOptional: false,
    daysUntil: 49,
    dayOfWeek: 'Friday',
  },
];

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
  const [apiHolidays, setApiHolidays] = useState<Holiday[]>([]);
  const [apiLoading, setApiLoading] = useState(!propHolidays);

  useEffect(() => {
    if (propHolidays) return; // Use prop data if provided
    const fetchHolidays = async () => {
      try {
        setApiLoading(true);
        const data = await homeService.getUpcomingHolidays(90);
        if (data && data.length > 0) {
          setApiHolidays(data.map(mapApiHoliday));
        }
      } catch {
        // Fall back to demo data silently
      } finally {
        setApiLoading(false);
      }
    };
    fetchHolidays();
  }, [propHolidays]);

  const holidays = propHolidays ?? (apiHolidays.length > 0 ? apiHolidays : DEMO_HOLIDAYS);
  const isLoading = propLoading || apiLoading;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const displayedHolidays = holidays;

  useEffect(() => {
    if (displayedHolidays.length <= 1 || isHovering) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayedHolidays.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovering, displayedHolidays.length]);

  if (displayedHolidays.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Holidays</h3>
        </div>
        <p className="text-sm text-[var(--text-muted)] text-center py-4">
          No upcoming holidays
        </p>
      </div>
    );
  }

  const currentHoliday = displayedHolidays[currentIndex];

  return (
    <div
      className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Upcoming Holidays
        </h3>
        <a
          href="/holidays"
          className="text-xs text-[var(--text-muted)] hover:text-gray-700 dark:text-[var(--text-muted)] dark:hover:text-gray-300 transition-colors"
        >
          View All
        </a>
      </div>

      {/* Holiday Card — clean flat style */}
      <div className="rounded-lg bg-[var(--bg-surface)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-white border border-[var(--border-main)] dark:bg-gray-800 dark:border-gray-700">
            <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {currentHoliday.name}
            </h4>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {currentHoliday.dayOfWeek}, {currentHoliday.date}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-[var(--text-muted)]">
                {currentHoliday.daysUntil > 0 ? `In ${currentHoliday.daysUntil} days` : 'Today'}
              </span>
              <span className="inline-block rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] uppercase dark:bg-gray-700 dark:text-[var(--text-muted)]">
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
            className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {displayedHolidays.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-4 bg-gray-500 dark:bg-gray-400' : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % displayedHolidays.length)}
            className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
