'use client';

import React from 'react';
import { Calendar, Cake, Gift } from 'lucide-react';
import { UpcomingEvents } from '@/lib/types/analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface UpcomingEventsCardProps {
  data: UpcomingEvents;
  className?: string;
}

export const UpcomingEventsCard: React.FC<UpcomingEventsCardProps> = ({ data, className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Upcoming Events (Next 30 Days)</CardTitle>
        <CardDescription>Birthdays, anniversaries, and holidays</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Birthdays */}
        {data.birthdays.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Cake className="h-4 w-4 text-pink-600" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Birthdays</h4>
            </div>
            <div className="space-y-2">
              {data.birthdays.slice(0, 5).map((birthday, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-pink-50 dark:bg-pink-950/20 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {birthday.employeeName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{birthday.department}</p>
                  </div>
                  <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">{birthday.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anniversaries */}
        {data.anniversaries.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-4 w-4 text-purple-600" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Work Anniversaries</h4>
            </div>
            <div className="space-y-2">
              {data.anniversaries.slice(0, 5).map((anniversary, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {anniversary.employeeName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {anniversary.department} • {anniversary.years} years
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {anniversary.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Holidays */}
        {data.holidays.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Holidays</h4>
            </div>
            <div className="space-y-2">
              {data.holidays.slice(0, 5).map((holiday, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{holiday.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{holiday.type}</p>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{holiday.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.birthdays.length === 0 && data.anniversaries.length === 0 && data.holidays.length === 0 && (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No upcoming events</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
