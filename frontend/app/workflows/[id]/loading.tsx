'use client';

import {motion} from 'framer-motion';
import {Skeleton} from '@mantine/core';
import {PageTransition} from '@/components/motion';

export default function WorkflowDetailLoading() {
  return (
    <PageTransition>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header skeleton */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3}}
          className="flex items-center gap-4"
        >
          <Skeleton height={32} width={32} radius="md"/>
          <div className="space-y-2 flex-1">
            <Skeleton height={28} width="40%" radius="md"/>
            <Skeleton height={16} width="30%" radius="md"/>
          </div>
        </motion.div>

        {/* Info cards skeleton */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: 0.1}}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {Array.from({length: 4}).map((_, i) => (
            <div key={i} className="rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 space-y-2">
              <Skeleton height={14} width="50%" radius="sm"/>
              <Skeleton height={20} width="60%" radius="sm"/>
            </div>
          ))}
        </motion.div>

        {/* Pipeline skeleton */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: 0.15}}
          className="rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4"
        >
          <Skeleton height={120} radius="sm"/>
        </motion.div>

        {/* Steps skeleton */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: 0.2}}
          className="rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4"
        >
          <div className="space-y-4">
            {Array.from({length: 3}).map((_, i) => (
              <Skeleton key={i} height={60} radius="sm"/>
            ))}
          </div>
        </motion.div>

        {/* Settings skeleton */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: 0.25}}
          className="rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({length: 6}).map((_, i) => (
              <Skeleton key={i} height={48} radius="sm"/>
            ))}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
