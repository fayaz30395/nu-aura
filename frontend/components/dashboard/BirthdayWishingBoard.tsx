'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper, Gift } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUpcomingBirthdays } from '@/lib/hooks/queries/useHome';

/* ─── Balloon SVG Components ─────────────────────────────────────────────── */

function Balloon({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 40 60" className={className} fill="none">
      <ellipse cx="20" cy="22" rx="14" ry="18" fill={color} />
      <ellipse cx="20" cy="22" rx="14" ry="18" fill="white" opacity="0.15" />
      {/* Highlight */}
      <ellipse cx="14" cy="16" rx="4" ry="6" fill="white" opacity="0.25" transform="rotate(-15 14 16)" />
      {/* Knot */}
      <polygon points="18,39 20,42 22,39" fill={color} />
      {/* String */}
      <path d="M20 42 Q 18 50, 20 58" stroke={color} strokeWidth="0.8" fill="none" opacity="0.6" />
    </svg>
  );
}

function FloatingBalloons() {
  const balloonColors = ['#8B5CF6', '#A78BFA', '#7C3AED', '#6D28D9', '#818CF8', '#C084FC'];

  return (
    <div className="absolute inset-x-0 top-0 h-24 overflow-hidden pointer-events-none">
      {balloonColors.map((color, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${10 + i * 14}%`,
            top: 0,
          }}
          animate={{
            y: [0, -6, 0, -4, 0],
            rotate: [0, -3, 0, 3, 0],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        >
          <Balloon color={color} className="w-8 h-12" />
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Confetti Particles ─────────────────────────────────────────────────── */

function ConfettiParticle({ delay, left }: { delay: number; left: string }) {
  const colors = ['#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#3B82F6', '#F97316'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
      style={{ backgroundColor: color, left, top: '20%' }}
      animate={{
        y: [0, 120],
        x: [0, (Math.random() - 0.5) * 40],
        opacity: [1, 0],
        rotate: [0, 360],
      }}
      transition={{
        duration: 2.5,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

/* ─── Banner Bunting ─────────────────────────────────────────────────────── */

function BuntingFlags() {
  const flagColors = ['#8B5CF6', '#A78BFA', '#7C3AED', '#818CF8', '#C084FC', '#8B5CF6', '#A78BFA', '#7C3AED', '#818CF8', '#C084FC', '#8B5CF6', '#A78BFA'];

  return (
    <div className="absolute inset-x-0 top-0 h-6 overflow-hidden pointer-events-none">
      <svg viewBox="0 0 400 24" className="w-full h-6" preserveAspectRatio="none">
        {/* String */}
        <path
          d="M0 4 Q 50 12, 100 4 Q 150 12, 200 4 Q 250 12, 300 4 Q 350 12, 400 4"
          fill="none"
          stroke="#A78BFA"
          strokeWidth="0.8"
          opacity="0.5"
        />
        {/* Flags */}
        {flagColors.map((color, i) => {
          const x = 16 + i * 32;
          const y = i % 2 === 0 ? 6 : 10;
          return (
            <polygon
              key={i}
              points={`${x - 6},${y} ${x + 6},${y} ${x},${y + 12}`}
              fill={color}
              opacity="0.7"
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Wisher Avatars ─────────────────────────────────────────────────────── */

function WisherAvatars({ wishers }: { wishers: { name: string; avatarUrl?: string }[] }) {
  if (wishers.length === 0) return null;

  return (
    <div className="flex items-center justify-center -space-x-2 mt-3">
      {wishers.slice(0, 5).map((w, i) => {
        const initials = w.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        return (
          <div
            key={i}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white dark:border-[var(--bg-card)] bg-accent-100 dark:bg-accent-900/40 text-[10px] font-bold text-accent-700 dark:text-accent-400 shadow-sm"
            title={w.name}
          >
            {w.avatarUrl ? (
              <img src={w.avatarUrl} alt={w.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
        );
      })}
      {wishers.length > 5 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white dark:border-[var(--bg-card)] bg-[var(--bg-surface)] text-[10px] font-bold text-[var(--text-muted)]">
          +{wishers.length - 5}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

interface BirthdayWishingBoardProps {
  /** Override for testing — if true, always show the board */
  forceShow?: boolean;
}

export function BirthdayWishingBoard({ forceShow }: BirthdayWishingBoardProps) {
  const { user } = useAuth();
  const { data: birthdays = [] } = useUpcomingBirthdays(1);
  const [dismissed] = useState(false);

  // Check if today is the logged-in user's birthday
  const isTodayMyBirthday = useMemo(() => {
    if (forceShow) return true;
    if (!user?.employeeId) return false;
    return birthdays.some(b => b.employeeId === user.employeeId && b.isToday);
  }, [user?.employeeId, birthdays, forceShow]);

  // Simulate wishers — in production, fetch from a birthday wishes API
  const wishers = useMemo(() => {
    // Placeholder wishers from birthday data (team members who have birthdays = colleagues)
    // In production, replace with actual wishes endpoint
    return birthdays
      .filter(b => b.employeeId !== user?.employeeId)
      .slice(0, 5)
      .map(b => ({ name: b.employeeName, avatarUrl: b.avatarUrl }));
  }, [birthdays, user?.employeeId]);

  if (!isTodayMyBirthday || dismissed) return null;

  const displayName = user?.fullName || 'Team Member';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden rounded-lg border border-purple-200 dark:border-purple-800/40 bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-purple-950/40 dark:via-[var(--bg-card)] dark:to-violet-950/30"
    >
      {/* Decorative elements */}
      <BuntingFlags />
      <FloatingBalloons />

      {/* Confetti particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <ConfettiParticle key={i} delay={i * 0.4} left={`${10 + i * 10}%`} />
      ))}

      {/* Content */}
      <div className="relative z-10 px-6 pt-20 pb-6 text-center">
        {/* Avatar with party hat effect */}
        <div className="relative inline-block mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40 text-xl font-bold text-purple-700 dark:text-purple-400 border-2 border-purple-300 dark:border-purple-700 shadow-lg mx-auto">
            {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <PartyPopper className="h-6 w-6 text-yellow-500" />
          </motion.div>
        </div>

        {/* Birthday message */}
        <h3 className="text-lg font-bold text-purple-900 dark:text-purple-200">
          Happy birthday, {displayName}!
        </h3>
        <p className="text-sm text-purple-700/70 dark:text-purple-400/70 mt-1 max-w-xs mx-auto">
          May this year bring you joy, success, and wonderful memories with the team!
        </p>

        {/* See wishes button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-purple-900/30 px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-300 shadow-sm hover:bg-purple-50 dark:hover:bg-purple-900/50 transition-colors"
          onClick={() => {
            // Navigate to wishes view — for now, scroll to celebrations section
            const celebrationSection = document.querySelector('[data-section="celebrations"]');
            if (celebrationSection) {
              celebrationSection.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          <Gift className="h-4 w-4" />
          See your wishes
        </motion.button>

        {/* Wisher avatars */}
        <WisherAvatars wishers={wishers} />
      </div>
    </motion.div>
  );
}
