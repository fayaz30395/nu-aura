'use client';

import {motion} from 'framer-motion';
import {Skeleton} from '@mantine/core';
import {PageTransition} from '@/components/motion';

export default function WorkflowsLoading() {
  return (
    <PageTransition>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header skeleton */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3}}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="space-y-2">
            <Skeleton height={28} width="45%" radius="md"/>
            <Skeleton height={16} width="35%" radius="md"/>
          </div>
          <Skeleton height={40} width={140} radius="md"/>
        </motion.div>

        {/* Filters skeleton */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: 0.1}}
          className="flex flex-col sm:flex-row gap-2 sm:gap-4"
        >
          <div className="flex-1 flex gap-2">
            <Skeleton height={36} width={200} radius="md"/>
            <Skeleton height={36} width={140} radius="md"/>
          </div>
          <Skeleton height={36} width={200} radius="md"/>
        </motion.div>

        {/* Table skeleton */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: 0.15}}
          className="rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] overflow-hidden"
        >
          <div className="border-b border-[var(--border-soft)] h-14 flex items-center px-4">
            <Skeleton height={20} width="30%" radius="sm"/>
          </div>
          <div className="space-y-0 divide-y divide-[var(--border-soft)]">
            {Array.from({length: 6}).map((_, index) => (
              <div key={index} className="h-14 px-4 py-3 flex items-center bg-[var(--surface)]">
                <Skeleton height={16} width="60%" radius="sm"/>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
