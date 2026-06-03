'use client';

import {motion} from 'framer-motion';
import {Skeleton} from '@mantine/core';
import {PageTransition} from '@/components/motion';

export default function WellnessLoading() {
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

        {/* Stats cards skeleton */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: 0.1}}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {Array.from({length: 4}).map((_, index) => (
            <div
              key={index}
              className="rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 space-y-3"
            >
              <Skeleton height={14} width="50%" radius="sm"/>
              <Skeleton height={28} width="40%" radius="sm"/>
              <Skeleton height={14} width="60%" radius="sm"/>
            </div>
          ))}
        </motion.div>

        {/* Quick log skeleton */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: 0.15}}
          className="rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4"
        >
          <Skeleton height={20} width="20%" radius="md" className="mb-3"/>
          <div className="flex flex-wrap gap-2">
            {Array.from({length: 5}).map((_, i) => (
              <Skeleton key={i} height={36} width={100} radius="md"/>
            ))}
          </div>
        </motion.div>

        {/* Content sections skeleton */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, delay: 0.2}}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 space-y-3">
            <div className="flex gap-2 border-b border-[var(--border-soft)] pb-2">
              <Skeleton height={24} width={80} radius="sm"/>
              <Skeleton height={24} width={80} radius="sm"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({length: 4}).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 space-y-3"
                >
                  <Skeleton height={16} width="60%" radius="sm"/>
                  <Skeleton height={16} width="80%" radius="sm"/>
                  <Skeleton height={16} width="70%" radius="sm"/>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div>
            <div className="rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 space-y-3">
              <Skeleton height={20} width="60%" radius="md"/>
              {Array.from({length: 5}).map((_, i) => (
                <Skeleton key={i} height={40} radius="md"/>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
