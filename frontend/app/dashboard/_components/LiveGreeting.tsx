'use client';

import type {ReactNode} from 'react';
import {useEffect, useState} from 'react';
import {format} from 'date-fns';
import {PageHeader} from '@/components/ui/PageHeader';

/**
 * Owns the clock so only the header re-renders on each tick, not the whole dashboard.
 * `currentTime` starts null so server and first client render match (SSR-safe).
 */
export function LiveGreeting({firstName, actions}: {firstName: string; actions?: ReactNode}) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const greetHour = currentTime?.getHours() ?? 9;
  const greeting = greetHour < 12 ? 'Good morning' : greetHour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingDate = currentTime ? format(currentTime, 'EEEE, MMMM d') : '';

  return (
    <PageHeader
      title={`${greeting}, ${firstName}`}
      description={`${greetingDate ? `${greetingDate} · ` : ''}Here's what's moving across your workspace today.`}
      actions={actions}
    />
  );
}

LiveGreeting.displayName = 'LiveGreeting';
