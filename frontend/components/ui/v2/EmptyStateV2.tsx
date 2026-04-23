'use client';

import * as React from 'react';
import {motion, useReducedMotion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {fadeRise, reduceVariants} from '@/lib/animations/v2';
import {EmptyInbox, EmptyChart, EmptyCalendar, EmptySearch, EmptyTable} from './icons';

export type EmptyIcon = 'inbox' | 'chart' | 'calendar' | 'search' | 'table';

const ICONS: Record<EmptyIcon, React.FC<{size?: number; className?: string}>> = {
  inbox: EmptyInbox,
  chart: EmptyChart,
  calendar: EmptyCalendar,
  search: EmptySearch,
  table: EmptyTable,
};

interface EmptyStateV2Props {
  icon?: EmptyIcon | React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyStateV2({
  icon = 'inbox',
  title,
  description,
  action,
  className,
}: EmptyStateV2Props) {
  const shouldReduce = useReducedMotion() ?? false;
  const variants = reduceVariants(fadeRise, shouldReduce);

  const iconEl =
    typeof icon === 'string' ? React.createElement(ICONS[icon as EmptyIcon], {size: 88}) : icon;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={variants}
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className
      )}
    >
      <div className="mb-4 text-[var(--accent-primary)]">{iconEl}</div>
      <h3 className="text-sm font-semibold text-[var(--text-heading)]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--text-muted)] max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
