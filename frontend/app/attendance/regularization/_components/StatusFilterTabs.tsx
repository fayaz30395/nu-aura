'use client';

import { motion } from 'framer-motion';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface StatusFilterTabsProps {
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}

export function StatusFilterTabs({ statusFilter, onFilterChange }: StatusFilterTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--border-main)]">
      {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
        <motion.button
          key={tab}
          onClick={() => onFilterChange(tab)}
          className="relative px-4 py-3 text-sm font-medium transition-colors"
          whileHover={{ y: -1 }}
          whileTap={{ y: 0 }}
        >
          <span
            className={
              statusFilter === tab
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }
          >
            {tab}
          </span>
          {statusFilter === tab && (
            <motion.div
              layoutId="tabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}
