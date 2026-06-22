'use client';

import {useEffect, useState} from 'react';
import {format} from 'date-fns';

/**
 * Owns the once-per-second clock so only this small block re-renders on each tick —
 * not the whole 1500-line dashboard (Epic F1: kills the page-wide 1-sec re-render).
 *
 * Behaviour-identical to the previous inline greeting derivation: same null-initial
 * (SSR-safe) `currentTime`, same greeting thresholds, same date format, same markup.
 * Pure presentation — no query, data, or RBAC concern lives here.
 */
export function LiveGreeting({firstName}: {firstName: string}) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize on client only to prevent SSR hydration mismatch
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greetHour = currentTime?.getHours() ?? 9;
  const greeting = greetHour < 12 ? 'Good morning' : greetHour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingDate = currentTime ? format(currentTime, 'EEEE, MMMM d') : '';

  return (
    <div className="min-w-0 space-y-1.5">
      <h1 className="text-aura-title text-[var(--text-1)]">
        {greeting}, {firstName}
      </h1>
      <p className="text-sm text-[var(--text-3)]">
        {greetingDate ? `${greetingDate} · ` : ''}Here&apos;s what&apos;s moving across your workspace today.
      </p>
    </div>
  );
}

LiveGreeting.displayName = 'LiveGreeting';
