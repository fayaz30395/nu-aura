import React from 'react';
import { motion } from 'framer-motion';

interface PremiumMetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
  delay?: number;
}

/**
 * PremiumMetricCard - A showcase component for the AURA Midnight design system.
 * Features:
 * - Glassmorphism (Backdrop blur + semi-transparent background)
 * - Dynamic Glow Shadows
 * - Electric Violet & Emerald accents
 * - Snappy framer-motion animations
 */
export const PremiumMetricCard: React.FC<PremiumMetricCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 shadow-xl shadow-[var(--shadow-card)]"
    >
      {/* Background Glow Effect */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-500/10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-secondary-500/10 blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-400">{title}</span>
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10 text-primary-400 ring-1 ring-primary-500/20">
              {icon}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-white">{value}</h2>
          <span
            className={`flex items-center text-xs font-semibold ${
              isPositive ? 'text-success-400' : 'text-accent-400'
            }`}
          >
            {isPositive ? '↑' : '↓'} {change}
          </span>
        </div>

        <div className="mt-6">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: isPositive ? '75%' : '45%' }}
              transition={{ duration: 1, delay: delay + 0.5 }}
              className={`h-full rounded-full ${
                isPositive ? 'bg-gradient-to-r from-success-500 to-primary-500' : 'bg-gradient-to-r from-accent-500 to-primary-500'
              } shadow-[0_0_10px_rgba(139,92,246,0.3)]`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
